<script lang='ts'>
	import { api, reloadCanonical } from "$lib/helper";
	import Modal from "$lib/modal.svelte";
	import TeamRoster from "$lib/teamRoster.svelte";
	import { User } from "$lib/user";
    export let cupID:number;
    export let team:string;
    export let clear:Function;
    let captain = -1;
    let updating = false;
    let data = (async () => {
		let returnObject = await api(fetch, '/sql/cupTeamDisplay',{team,cupID});
        for(const p in returnObject.players){
            if(returnObject.players[p].player.captain)
                captain = parseInt(p);
        }
		return returnObject;
	})();
    async function update(){
        updating = true;
        let players = await data.then((r)=>{
            return r.players;
        });
        for(let p in players){
            if(parseInt(p)==captain) {
                players[p].player.captain = true;
            } else {
                players[p].player.captain = false;
            }
            players[p] = players[p].player
        }
        await api(fetch, '/sql/updateCupTeam',{players})
        reloadCanonical();
    }
    async function deletePlayer(playerID: number, name: string) {
        if (!confirm(`Delete player "${name}" (ID ${playerID})? This cannot be undone.`)) return;
        updating = true;
        let res = await api(fetch, '/sql/deleteCupPlayer', {playerID});
        if (!res || res.error) {
            updating = false;
            alert(res?.error ?? 'Failed to delete player.');
            return;
        }
        reloadCanonical();
    }
</script>
<Modal close={clear} title={`/${team}/`}>
    {#await data}
        Loading...
    {:then data}
        {#if $User.access > 0}
        <table>
	    <tbody>
            <tr>
                <th>ID</th>
                <th>Starting</th>
                <th>Player</th>
                <th>Medal</th>
                <th>Captain</th>
                <th>Pos</th>
                <th>#</th>
                <th>Link</th>
                {#if $User.access >= 3}<th></th>{/if}
            </tr>
        {#each data.players as p,i}
            <tr>
                <td><small>{p.player.playerID}</small></td>
                <td><input type='checkbox' bind:checked={data.players[i].player.starting} ></td>
                <td><input bind:value={data.players[i].player.name}></td>
                <td><select bind:value={data.players[i].player.medal}>
                    <option></option>
                    <option>Gold</option>
                    <option>Silver</option>
                    <option>Bronze</option>
                </select></td>
                <td><input type='radio' value={i} bind:group={captain}></td>
                <td><input style:width={'2.5rem'} bind:value={data.players[i].player.regPos}></td>
                <td><input style:width={'2.5rem'} bind:value={data.players[i].player.shirtNumber}></td>
                <td><select bind:value={data.players[i].player.linkID}>
                    <option></option>
                    {#each data.links as link}
                    <option value={link.linkID}>{link.name}</option>
                    {/each}
                </select></td>
                {#if $User.access >= 3}
                <td><button
                    class="delete"
                    title="Delete player"
                    disabled={updating}
                    on:click={()=>{deletePlayer(p.player.playerID, p.player.playerName)}}
                >x</button></td>
                {/if}
            </tr>
        {/each}
	</tbody>
        </table>
        <button disabled={updating} on:click={()=>{update()}}>Update</button>
        {:else}
        <TeamRoster roster={data.players} />
        {/if}
    {/await}
</Modal>
<style>
    small{
        font-size: xx-small;
    }
    td{
        text-align: left;
    }
    table{
        display:inline-block;
        vertical-align: top;
    }
    button.delete{
        color: #b00;
        font-weight: bold;
        line-height: 1;
        padding: 0.15rem 0.4rem;
        cursor: pointer;
    }
    button.delete:disabled{
        cursor: default;
        opacity: 0.5;
    }
</style>
