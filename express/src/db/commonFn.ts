import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lte,
  or,
  sum,
} from "drizzle-orm";
import { union } from "drizzle-orm/mysql-core";
import { db } from ".";
import { assistTypes, goalTypes, goalTypesOG } from "../lib/helper";
import {
  Cup,
  Event,
  Match,
  Penalty,
  Performance,
  Player,
  PlayerLink,
  RosterOrder,
  Round,
} from "./schema";
export async function getCup(id: number) {
  return await db.query.Cup.findFirst({
    where: (c, { eq }) => eq(c.cupID, id),
  });
}
export async function getCupTeams(id: number) {
  return (
    await union(
      db
        .selectDistinct({ team: Match.homeTeam })
        .from(Match)
        .where(and(eq(Match.cupID, id), eq(Match.official, 1))),
      db
        .selectDistinct({ team: Match.awayTeam })
        .from(Match)
        .where(and(eq(Match.cupID, id), eq(Match.official, 1)))
    )
  ).map((x) => x.team);
}
// group stage standing ranked by pts -> GD -> GF
export async function getGroupStandings(
  cupID: number
): Promise<
  Record<
    string,
    Array<{
      team: string;
      pld: number;
      w: number;
      d: number;
      l: number;
      gf: number;
      ga: number;
      gd: number;
      pts: number;
    }>
  >
> {
  const groupMatches = await db
    .select()
    .from(Match)
    .where(
      and(
        eq(Match.cupID, cupID),
        eq(Match.official, 1),
        eq(Match.valid, 1),
        like(Match.round, "Group %")
      )
    );

  type Row = {
    team: string;
    pld: number;
    w: number;
    d: number;
    l: number;
    gf: number;
    ga: number;
    gd: number;
    pts: number;
  };
  const groups: Record<string, Record<string, Row>> = {};
  const ensure = (round: string, team: string): Row => {
    (groups[round] ??= {});
    return (groups[round][team] ??= {
      team,
      pld: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    });
  };

  for (const m of groupMatches) {
    let homeG = 0;
    let awayG = 0;
    for (const e of await getEvents({ matchID: m.matchID })) {
      const t = e.player.team;
      if (goalTypes.includes(e.event.eventType)) {
        if (t === m.homeTeam) homeG++;
        else awayG++;
      } else if (goalTypesOG.includes(e.event.eventType)) {
        // own goals are opponent goals
        if (t === m.homeTeam) awayG++;
        else homeG++;
      }
    }

    const home = ensure(m.round, m.homeTeam);
    const away = ensure(m.round, m.awayTeam);
    home.pld++;
    away.pld++;
    home.gf += homeG;
    home.ga += awayG;
    away.gf += awayG;
    away.ga += homeG;
    if (m.winningTeam === "draw") {
      home.d++;
      away.d++;
      home.pts++;
      away.pts++;
    } else if (m.winningTeam === m.homeTeam) {
      home.w++;
      home.pts += 3;
      away.l++;
    } else if (m.winningTeam === m.awayTeam) {
      away.w++;
      away.pts += 3;
      home.l++;
    }
    // if none of the above, no winner has been entered yet
  }

  const standings: Record<string, Row[]> = {};
  for (const round in groups) {
    for (const team in groups[round]) {
      groups[round][team].gd = groups[round][team].gf - groups[round][team].ga;
    }

    standings[round] = Object.values(groups[round]).sort((a, b) =>
      b.pts !== a.pts
        ? b.pts - a.pts
        : b.pd !== a.gd
          ? b.gd - a.pld
          : b.gf - a.gf
    );
  }
  return standings;
}

export async function getKnockoutTeams(cupID: number): Promise<string[]> {
  const standings = await getGroupStandings(cupID);
  const teams: string[] = [];
  for (const round in standings) {
    teams.push(...standings[round].slice(0, 2).map((r) => r.team));
  }
  return teams;
}
export async function getCups(options?: {
  excludeFriendlies?: boolean;
  cupList?: number[];
  asc?: boolean;
}) {
  const where = and(
    options?.excludeFriendlies == true
      ? lte(Cup.cupType, 3)
      : lte(Cup.cupType, 4),
    options?.cupList ? inArray(Cup.cupID, options.cupList) : undefined
  );
  return await db
    .select()
    .from(Cup)
    .where(where)
    .orderBy(options?.asc == true ? asc(Cup.start) : desc(Cup.start));
}

export async function getMatches(options?: {
  getVoided?: boolean;
  getUnofficial?: boolean;
  sort?: "asc" | "desc";
  roundSort?: "asc" | "desc";
  team?: string;
  cupID?: number;
  matchID?: number;
  start?: Date;
  end?: Date;
}) {
  return db
    .select()
    .from(Match)
    .innerJoin(Round, eq(Match.round, Round.round))
    .innerJoin(Cup, eq(Match.cupID, Cup.cupID))
    .where(
      and(
        options?.cupID ? eq(Match.cupID, options.cupID) : undefined,
        options?.getVoided ? undefined : eq(Match.valid, 1),
        options?.getUnofficial ? undefined : eq(Match.official, 1),
        options?.team
          ? or(
              eq(Match.homeTeam, options.team),
              eq(Match.awayTeam, options.team)
            )
          : undefined,
        options?.matchID ? eq(Match.matchID, options.matchID) : undefined,
        options?.start ? gte(Match.utcTime, options.start) : undefined,
        options?.end ? lte(Match.utcTime, options.end) : undefined
      )
    )
    .orderBy(
      Cup.start,
      options?.roundSort == "desc" ? desc(Round.order) : asc(Round.order),
      Round.round,
      options?.sort == "desc" ? desc(Match.utcTime) : asc(Match.utcTime),
      Match.matchID
    );
}

export async function getEvents(options: {
  cupID?: number;
  matchID?: number;
  eventTypes?: number[];
  getVoided?: boolean;
  getFriendlies?: boolean;
  linkID?: number;
  team?: string;
}) {
  const where = and(
    options.getVoided ? undefined : eq(Match.valid, 1),
    options.eventTypes
      ? inArray(Event.eventType, options.eventTypes)
      : undefined,
    options.cupID ? eq(Match.cupID, options.cupID) : undefined,
    options.getFriendlies ? undefined : lte(Cup.cupType, 3),
    options.matchID ? eq(Match.matchID, options.matchID) : undefined,
    options.linkID ? eq(Player.linkID, options.linkID) : undefined,
    options?.team ? eq(Player.team, options.team) : undefined
  );

  return await db
    .select()
    .from(Event)
    .innerJoin(Match, eq(Event.matchID, Match.matchID))
    .innerJoin(Player, eq(Event.playerID, Player.playerID))
    .innerJoin(Cup, eq(Match.cupID, Cup.cupID))
    .where(where)
    .orderBy(Event.regTime, Event.injTime, Event.eventType);
}
export async function getPerformances(options: {
  cupID?: number;
  matchID?: number;
  getVoided?: boolean;
  team?: string;
  getFriendlies?: boolean;
  linkID?: number;
  playerID?: number;
  motm?: boolean;
  end?: Date;
}) {
  const where = and(
    options.getVoided ? undefined : eq(Match.valid, 1),
    options.cupID ? eq(Match.cupID, options.cupID) : undefined,
    options.matchID ? eq(Match.matchID, options.matchID) : undefined,
    options.team ? eq(Player.team, options.team) : undefined,
    options.getFriendlies ? undefined : lte(Cup.cupType, 3),
    options.linkID ? eq(Player.linkID, options.linkID) : undefined,
    options.playerID ? eq(Player.playerID, options.playerID) : undefined,
    options.motm ? eq(Performance.motm, options.motm) : undefined,
    options?.end ? lte(Match.utcTime, options.end) : undefined
  );
  return await db
    .select()
    .from(Performance)
    .innerJoin(Match, eq(Performance.matchID, Match.matchID))
    .innerJoin(Player, eq(Performance.playerID, Player.playerID))
    .innerJoin(Cup, eq(Match.cupID, Cup.cupID))
    .where(where)
    .orderBy(Match.utcTime, Performance.subOn, Performance.perfID);
}

export async function getPlayers(options: {
  cupID?: number;
  team?: string;
  getFriendlies?: boolean;
  linkID?: number | null;
  playerID?: number | null;
  like?: string;
}) {
  const where = and(
    options.cupID ? eq(Player.cupID, options.cupID) : undefined,
    options.team ? eq(Player.team, options.team) : undefined,
    options.getFriendlies ? undefined : lte(Cup.cupType, 3),
    options.linkID ? eq(Player.linkID, options.linkID) : undefined,
    options.like
      ? or(like(Player.name, options.like), like(PlayerLink.name, options.like))
      : undefined,
    options.playerID ? eq(Player.playerID, options.playerID) : undefined
  );

  return await db
    .select()
    .from(Player)
    .innerJoin(Cup, eq(Player.cupID, Cup.cupID))
    .leftJoin(RosterOrder, eq(Player.regPos, RosterOrder.pos))
    .leftJoin(PlayerLink, eq(Player.linkID, PlayerLink.linkID))
    .where(where)
    .orderBy(Player.cupID, Player.name);
}

export async function getMost(
  type: "goals" | "assists" | "saves",
  cupID: number
) {
  if (type == "goals" || type == "assists") {
    const eventTypes = type == "goals" ? goalTypes : assistTypes;
    return await db
      .select({
        linkID: Player.linkID,
        count: count(),
      })
      .from(Event)
      .innerJoin(Match, eq(Event.matchID, Match.matchID))
      .innerJoin(Player, eq(Event.playerID, Player.playerID))
      .where(
        and(
          eq(Match.cupID, cupID),
          gt(Player.linkID, 0),
          inArray(Event.eventType, eventTypes),
          eq(Match.valid, 1),
          eq(Match.official, 1)
        )
      )
      .groupBy(Player.linkID)
      .orderBy(({ count }) => desc(count))
      .limit(1);
  } else {
    return await db
      .select({
        linkID: Player.linkID,
        count: sum(Performance.saves),
      })
      .from(Performance)
      .innerJoin(Match, eq(Performance.matchID, Match.matchID))
      .innerJoin(Player, eq(Performance.playerID, Player.playerID))
      .where(
        and(
          eq(Match.cupID, cupID),
          gt(Player.linkID, 0),
          gt(Performance.saves, 0),
          eq(Match.valid, 1),
          eq(Match.official, 1)
        )
      )
      .groupBy(Player.linkID)
      .orderBy(({ count }) => desc(count))
      .limit(1);
  }
}
export async function getPenalties(options: {
  cupID?: number;
  matchID?: number;
  getVoided?: boolean;
  linkID?: number;
  team?: string;
}) {
  const where = and(
    options.getVoided ? undefined : eq(Match.valid, 1),
    options.cupID ? eq(Match.cupID, options.cupID) : undefined,
    options.matchID ? eq(Match.matchID, options.matchID) : undefined,
    options.linkID ? eq(Player.linkID, options.linkID) : undefined,
    options?.team ? eq(Player.team, options.team) : undefined
  );

  return await db
    .select()
    .from(Penalty)
    .innerJoin(Match, eq(Penalty.matchID, Match.matchID))
    .innerJoin(Player, eq(Penalty.playerID, Player.playerID))
    .where(where)
    .orderBy(Penalty.penaltyID);
}
export async function getUser(name: string, hash: string) {}
