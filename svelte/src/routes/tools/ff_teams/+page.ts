import { api } from '$lib/helper';
import { User } from '$lib/user';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';

export async function load({ fetch }) {
    const user = get(User);

    if (user.access < 3) {
        redirect(303, '/');
    }

    const teamList = await api(fetch, '/ff/teamListID');
    return { teamList };
}