<script lang="ts">
    import { api } from '$lib/helper';
    import Modal from '$lib/modal.svelte';

    export let data: { teamList: any[] };

    let newPassword = '';

    async function resetPassword(id: string) {
        newPassword = (await api(fetch, '/ff/resetPassword', { id })).prv;
    }
</script>

<container>
    {#if newPassword}
        <Modal
            close={() => { newPassword = ''; }}
            title={'Password'}
        >
            Team's new password is {newPassword}
        </Modal>
    {/if}

    <table>
        <tbody>
            {#each data.teamList as user}
                <tr>
                    <td>{user.name}</td>
                    <td>
                        <button on:click={() => resetPassword(user.teamID)}>
                            Reset Password
                        </button>
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
</container>

<style>
	container {
		padding: 2rem;
	}
	td {
		text-align: left;
		padding-bottom: 1rem;
	}
</style>