import { api } from '$lib/helper';

export async function load({ fetch }) {
    const cups = await api(fetch, '/cups/list');
    // Fetch initial cup data alongside cups list in parallel
    const initialCupData = await api(fetch, `/records/leaderboards/${cups[0].cupID}`);

    return {
        cups,
        initialCupData,
        initialCupID: cups[0].cupID
    };
}