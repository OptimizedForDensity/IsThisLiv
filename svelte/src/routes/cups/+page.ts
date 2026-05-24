import { api } from "$lib/helper";

export async function load({ fetch }) {
    const data = await api(fetch, '/cups');
    return { data };
}