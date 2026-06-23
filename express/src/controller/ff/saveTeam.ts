import { and, eq, like } from "drizzle-orm";
import { Request } from "express";
import { db } from "../../db";
import { Fantasy, FantasyPlayer, Match } from "../../db/schema";

export async function saveTeam(req: Request) {
  try {
    const { starting, bench, cap, vice, cupID, teamID } = req.body as {
      name: string;
      starting: number[];
      bench: number[];
      cupID: number;
      teamID: number;
      cap: number;
      vice: number;
    };
    const groupMatches = await db
      .select({ utcTime: Match.utcTime, winningTeam: Match.winningTeam })
      .from(Match)
      .where(
        and(
          eq(Match.cupID, cupID),
          eq(Match.official, 1),
          eq(Match.valid, 1),
          like(Match.round, "Group %")
        )
      );
    const firstKO = await db.query.Match.findFirst({
      orderBy: Match.utcTime,
      where: and(eq(Match.cupID, cupID), like(Match.round, "Survival Round %")),
    });
    const existing = await db.query.Fantasy.findFirst({
      where: eq(Fantasy.teamID, teamID),
    });
    if (!(existing?.name?.length > 0)) return { error: "Team not found" };
    let currentDate = new Date().getTime();
    const firstGroupTime = Math.min(
      ...groupMatches.map((m) => m.utcTime.getTime())
    );
    const groupStageComplete =
      groupMatches.length > 0 &&
      groupMatches.every((m) => m.winningTeam?.length > 0);
    let stage = 0;
    if (currentDate > firstGroupTime && !groupStageComplete)
      return { error: "Too late to save changes" };
    if (firstKO?.utcTime && currentDate > firstKO.utcTime.getTime())
      return { error: "Too late to save changes" };
    if (groupStageComplete) stage = 1;
    let iX = [bench, starting];
    await db
      .delete(FantasyPlayer)
      .where(
        and(eq(FantasyPlayer.teamID, teamID), eq(FantasyPlayer.stage, stage))
      );
    for (let i of [0, 1]) {
      for (const playerID of iX[i]) {
        await db.insert(FantasyPlayer).values({
          teamID,
          playerID,
          start: i,
          cap: cap == playerID ? 2 : vice == playerID ? 1 : 0,
          r1: 0,
          r2: 0,
          r3: 0,
          r4: 0,
          sr1: 0,
          sr2: 0,
          ro16: 0,
          qf: 0,
          sf: 0,
          fn: 0,
          tot: 0,
          stage,
        });
      }
    }
    return {};
  } catch (err) {
    console.log(err);
    return { error: "Something wrong happened" };
  }
}
