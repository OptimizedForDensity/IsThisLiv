/*import { api } from '$lib/helper';

export async function load({ fetch, params }) {
    const cupList = await api(fetch, '/cups/list');

    const cupID = params.slug?.split('-')?.[0];

    const cupData = await api(fetch, '/cups/' + cupID);

    // Only fetch records if cup exists
    const recordData = cupData.cupName
        ? await api(fetch, '/records/cups/' + cupData.cupID)
        : null;

    const imgs = null;

    return {
        cupList,
        cupData,
        recordData,
        imgs
    };
}*/