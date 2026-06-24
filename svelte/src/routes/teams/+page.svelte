<script lang='ts'>
	import TeamIcon from "$lib/teamIcon.svelte";
	import TeamLink from "$lib/teamLink.svelte";

	export let data: { teamData: { headers: Array<string>, data: Array<Record<string, string | number>> } };

	let teamData: { headers: Array<string>, data: Array<Record<string, string | number>> };

	let hideInactive: boolean = false;

	const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
	const isActive = (row: Record<string, string | number>) => {
		const last = row.lastMatch;
		if (!last) return false;
		return (Date.now() - new Date(last).getTime()) <= YEAR_MS;
	};

	const displayValues = (row: Record<string, string | number>) =>
		Object.entries(row)
			.filter(([key]) => key !== 'lastMatch')
			.map(([, value]) => value);

	let sortAsc = true;
	let sortField = -1;
	const sort = (field: number) => {
		if (field == sortField) {
			sortAsc = !sortAsc;
		} else {
			sortAsc = field == 0 ? true : false;
			sortField = field;
		}
		teamData.data.sort((a, b) => {
			let res = 0;
			let af = Object.values(a)[field];
			let bf = Object.values(b)[field];
			if (af > bf) {
				res = 1;
			} else if (af < bf) {
				res = -1;
			}
			if (!sortAsc) res *= -1;
			return res;
		});
		teamData = teamData;
	};

	$: {
		teamData = data.teamData;
        sort(0);
    }
</script>

<svelte:head>
	<title>Teams - IsThisLiv</title>
</svelte:head>
<div id="container">
	<h1>Team Stats</h1>
	{#if teamData}
		<p>Click on a header to sort</p>
		<label>
			<input type="checkbox" bind:checked={hideInactive}/>
			Only show teams active within the past year
		</label>
		<table>
			<thead>
				<tr>
					<th>#</th>
					{#each teamData.headers as header,i}
						<th
							on:click={() => {
								sort(i);
							}}>{@html header}</th
						>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each (hideInactive ? teamData.data.filter(isActive) : teamData.data) as row, i}
					<tr>
						<td>{i + 1}</td>
						{#each displayValues(row) as field, j}
							{#if j == 0}
							<td style:text-align='left'><TeamIcon team={field.toString()}/><TeamLink team={field.toString()} /></td>
							{:else}
							<td>{j==16 && field > 0 ? '+' : ''}{field}{[8].includes(j) ? '%' : ''}</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	th {
		background: var(--bg-color);
	}
	th:not(:first-child):hover {
		cursor: pointer;
	}
	tr:nth-of-type(2n) {
		background: rgba(0, 0, 0, 0.25);
	}
	tr:hover {
		background: rgba(255, 255, 255, 0.3);
	}
	thead {
		position: sticky;
		top: 0;
		background: inherit;
		z-index: 1;
	}
	table {
		background: inherit;
	}
	td > span {
		border-radius: 0.25rem;
	}
</style>

