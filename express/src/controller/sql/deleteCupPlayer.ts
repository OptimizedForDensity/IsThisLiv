import { eq } from "drizzle-orm";
import { Request } from "express";
import { db } from "../../db";
import { Event, Penalty, Performance, Player } from "../../db/schema";

export async function deleteCupPlayer(req: Request) {
    const { playerID } = req.body as { playerID: number };
    if (!playerID) return { error: "Missing playerID" };

    const [events, perfs, penalties] = await Promise.all([
        db.select().from(Event).where(eq(Event.playerID, playerID)),
        db.select().from(Performance).where(eq(Performance.playerID, playerID)),
        db.select().from(Penalty).where(eq(Penalty.playerID, playerID)),
    ]);

    if (events.length || perfs.length || penalties.length) {
        return {
            error: "Player has match data (events/performances/penalties) and cannot be deleted."
        };
    }

    await db.delete(Player).where(eq(Player.playerID, playerID));
    return {};
}