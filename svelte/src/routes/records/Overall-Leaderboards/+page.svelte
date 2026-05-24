<script lang='ts'>
	import Datetime from "$lib/datetime.svelte";
	import { api } from "$lib/helper";
	import { sidebarStore } from "$lib/sideBarStore";
	import Table from "./table.svelte";

    export let data: {
        cups: Array<{ cupID: number, [key: string]: any }>,
        initialCupData: any,
        initialCupID: number
    };

    let cup = data.initialCupID;
    let cups = data.cups;
    let leaderboardData = data.initialCupData;

    async function loadCup() {
        leaderboardData = await api(fetch, '/records/leaderboards/' + cup);
    }
    /*
    <Table title={'Goals Per Match (Min 10 matches)'} headers={['#','Board','Name','GPM (# Matches)']} rows={data.gpm} />

    */
    $sidebarStore = `Leaderboards`;
</script>
<container>
    {#await leaderboardData then leaderboardData}
        {#if leaderboardData !== undefined && leaderboardData.date !== undefined}
            <div id="pageModifiedTime">Last updated - <Datetime date={leaderboardData.date} multiline={false}/></div>
        {/if}
    {/await}
    <h2>Leaderboards {#if cups}
        <select bind:value={cup} on:change={()=>{loadCup}}>
            {#each cups as cup}
                <option value={cup.cupID}>{cup.cupName}</option>
            {/each}
        </select>
    {/if}</h2>
    {#await leaderboardData}
        Loading...
     {:then leaderboardData}
        {#if leaderboardData !== undefined && leaderboardData.date !== undefined}
            <data>
                <Table title={'All Time Goalscorers'} headers={['#','Board','Name','Goals']} rows={leaderboardData.mostGoals} />
                <Table title={'Most Hat Tricks'} headers={['#','Board','Name','Hat Tricks']} rows={leaderboardData.mostHattricks} />
                <Table title={'All Time Cards'} headers={['#','Board','Name','Cards']} rows={leaderboardData.mostCards} />
                <Table title={'All Time Assists'} headers={['#','Board','Name','Assists']} rows={leaderboardData.mostAssists} />
                <Table title={'All Time Saves'} headers={['#','Board','Name','Saves']} rows={leaderboardData.mostSaves} />
                <Table title={'All Time Minutes Played'} headers={['#','Board','Name','Minutes']} rows={leaderboardData.mostMinutes} />
                <Table title={'Most Man of the Matches'} headers={['#','Board','Name','Count']} rows={leaderboardData.mostMotm} />
                <Table title={'Most Matches Played'} headers={['#','Board','Name','Count']} rows={leaderboardData.mostMatchesP} />
                <Table title={'Most Matches Played (Team)'} headers={['#','Board','Count']} rows={leaderboardData.mostMatchesT} />
                <Table title={'Highest Avg Cond (Min 10 Matches)'} headers={['#','Board','Name','Cond (#)']} rows={leaderboardData.highestCondP} />
                <Table title={'Lowest Avg Cond (Min 10 Matches)'} headers={['#','Board','Name','Cond (#)']} rows={leaderboardData.lowestCondP} />
                <Table title={'Highest Avg Cond (Team)'} headers={['#','Board','Cond']} rows={leaderboardData.highestCondT} />
                <Table title={'Highest Avg Rating (Min 10 Matches)'} headers={['#','Board','Name','Rating (#)']} rows={leaderboardData.highestRateP} />
                <Table title={'Lowest Avg Rating (Min 10 Matches)'} headers={['#','Board','Name','Rating (#)']} rows={leaderboardData.lowestRateP} />
                <Table title={'Highest Avg Rating (Team)'} headers={['#','Board','Rating']} rows={leaderboardData.highestRateT} />
                <Table title={'Most Clean Sheets (Player)'} headers={['#','Board','Name','# (%)']} rows={leaderboardData.mostCleanP} />
                <Table title={'Highest Efficiency'} headers={['#','Board','Eff %','# Wins to 50%']} rows={leaderboardData.highestEff} />
             </data>
        {/if}
    {/await}
</container>
<style>
    container {
		display: block;
		padding: 1rem;
		height: calc(100% - 2rem);
		overflow-y: scroll;
	}
    h2 select{
        font-size: large;
        vertical-align: text-bottom;
    }
    #pageModifiedTime {
		float: right;
	}
    data{
        display:flex;
        flex-direction: row;
        flex-wrap: wrap;
    }
</style>