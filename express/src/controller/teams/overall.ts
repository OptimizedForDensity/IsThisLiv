import { and, eq, lte } from "drizzle-orm";
import { Request } from "express";
import { db } from "../../db";
import { Cup, Event, Match, Player } from "../../db/schema";
import {
  goalTypes,
  goalTypesOG,
  redCardTypes,
  yellowCardTypes,
} from "../../lib/helper";

export async function overall(req: Request) {
  const teams: Record<
    string,
    {
      team: string;
      elites: Set<string> | number;
      babbies: Set<string> | number;
      cups: Set<string> | number;
      pld: number;
      w: number;
      d: number;
      l: number;
      e: number;
      p: number;
      ap: number;
      gf: number;
      ga: number;
      agf: number;
      aga: number;
      gd: number;
      agd: number;
      y: number;
      r: number;
      tc: number;
      ac: number;
      np: number;
      at: number;
      atp: number;
      fr: number;
      eliteW:number;
      eliteL:number;
      eliteEff:number;
    }
  > = {};
  const matches = await db
    .select()
    .from(Match)
    .innerJoin(Cup, eq(Match.cupID, Cup.cupID))
    .where(eq(Match.valid, 1));
  for (const { match, cup } of matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (teams[team] == undefined) {
        teams[team] = {
          team, //
          elites: new Set(), //
          babbies: new Set(), //
          cups: new Set(), //
          w: 0, //
          d: 0, //
          l: 0, //
          pld: 0, //
          e: 0, //
          p: 0, //
          ap: 0, //
          gf: 0, //
          agf: 0, //
          ga: 0, //
          aga: 0, //
          gd: 0, //
          agd: 0, //
          y: 0, //
          r: 0, //
          tc: 0,
          ac: 0,
          np: 0,
          at: 0,
          atp: 0,
          fr: 0,
          eliteW:0,
          eliteL:0,
          eliteEff:0,
        };
      }
      const stat = teams[team];
      if (cup.cupType == 1) {
        if (typeof stat.elites !== "number")
          stat.elites.add(cup.season + cup.year);
          stat.cups.add(cup.season + cup.year);
      } else if (cup.cupType == 3) {
        if (typeof stat.babbies !== "number")
          stat.babbies.add(cup.season + cup.year);
          stat.cups.add(cup.season + cup.year);
      }
      if (match.winningTeam !== "") {
        stat.pld++;
        if (team == match.winningTeam) {
          stat.w++;
          if(cup.cupType == 1 && !match.round.includes('Group')){
           stat.eliteW++;
          }
        } else if (match.winningTeam == "draw") {
          stat.d++;
        } else {
          stat.l++;
          if(cup.cupType == 1 && !match.round.includes('Group')){
            stat.eliteL++;
          }
        }
      }
      const events = await db
        .select()
        .from(Event)
        .innerJoin(Player, eq(Event.playerID, Player.playerID))
        .where(eq(Event.matchID, match.matchID));
      for (const { event, player } of events) {
        if (goalTypesOG.includes(event.eventType)) {
          if (player.team == team) {
            teams[team].ga++;
          } else {
            teams[team].gf++;
          }
        } else if (goalTypes.includes(event.eventType)) {
          if (player.team == team) {
            teams[team].gf++;
          } else {
            teams[team].ga++;
          }
        } else if (
          yellowCardTypes.includes(event.eventType) &&
          player.team == team
        ) {
          teams[team].y++;
        } else if (
          redCardTypes.includes(event.eventType) &&
          player.team == team
        ) {
          teams[team].r++;
        }
      }
    }
  }
  const teamArr = Object.values(teams);
  for (const team of teamArr) {
    if (typeof team.elites !== "number")
      team.elites = Array.from(team.elites).length;
    if (typeof team.babbies !== "number")
      team.babbies = Array.from(team.babbies).length;
    if (typeof team.cups !== "number")
      team.cups = Array.from(team.cups).length;
    team.p = team.w * 3 + team.d;
    if (team.pld > 0) {
      team.e = Number(((team.w / team.pld) * 100).toFixed(2));
      team.ap = Number((team.p / team.pld).toFixed(2));
      team.aga = Number((team.ga / team.pld).toFixed(2));
      team.agf = Number((team.gf / team.pld).toFixed(2));
      team.gd = team.gf - team.ga;
      team.agd = Number((team.gd / team.pld).toFixed(3));
      team.tc = team.y + team.r;
      team.ac = Number((team.tc / team.pld).toFixed(3));
    }
    if (team.eliteW + team.eliteL > 0) {
      team.eliteEff = Number((team.eliteW / (team.eliteW + team.eliteL) * 100).toFixed(2));
    }
    const players = await db
      .select()
      .from(Player)
      .innerJoin(Cup, eq(Cup.cupID, Player.cupID))
      .where(and(eq(Player.team, team.team), lte(Cup.cupType, 3)))
      .orderBy(Cup.start);
    let playerLinks: Record<number, number> = {};
    let firstCup = 0;
    let lastCup = 0;
    let firstCupPlayers = [];
    for (const { player } of players) {
      if (playerLinks[player.linkID] == undefined)
        playerLinks[player.linkID] = 0;
      playerLinks[player.linkID]++;
      if (firstCup == 0) firstCup = player.cupID;
      if (firstCup == player.cupID) firstCupPlayers.push(player.linkID);
      lastCup = player.cupID;
    }
    team.np = Object.keys(playerLinks).length;
    if (Object.values(playerLinks).length > 0) {
    team.at =
      Object.values(playerLinks).reduce((a, b) => a + b) /
      Object.values(playerLinks).length;
    } else {
    team.at = 0;
    }
    if (team.cups > 0) {
      team.atp = Number(((team.at / team.cups) * 100).toFixed(2));
    }
    team.at = Number(team.at.toFixed(2));
    team.fr = players.filter(
      (x) => x.cup.cupID == lastCup && firstCupPlayers.includes(x.player.linkID)
    ).length;
  }
  return {
    headers: [
      "Team",
      "Leagues",
      "Qualifiers",
      "Cups",
      "W",
      "D",
      "L",
      "Pld",
      "Eff",
      "Pts",
      "Avg<br>Pts",
      "GF",
      "Avg<br>GF",
      "GA",
      "Avg<br>GA",
      "GD",
      "Avg<br>GD",
      "Yellows",
      "Reds",
      "Cards",
      "Avg<br>Cards",
      "# Players",
      "Avg<br>Tenure",
      "Avg<br>Tenure %",
      "# Debut<br>Roster<br>Players",
      'Elite<br>KO Wins',
      'Elite<br>KO Losses',
      'Elite<br>KO Eff %'
    ],
    data: teamArr,
  };
}
