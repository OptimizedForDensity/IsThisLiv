import { api } from "$lib/helper";

export async function load({ fetch }) {
    const teamData = await api(fetch, '/teams/overall');
    return { teamData };
}