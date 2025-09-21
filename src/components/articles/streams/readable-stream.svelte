<script lang="ts">
	let controller: ReadableStreamDefaultController;
	let unhandledError: unknown | null = $state(null);
	const internal: {
		state: "uninitialized" | "started" | "closed" | "cancelled" | "error";
		queue: number[];
		error: unknown | null;
	} = $state({
		state: "uninitialized",
		queue: [],
		error: null,
	});

	const stream = new ReadableStream({
		start(_controller) {
			controller = _controller;
			internal.state = "started";
		},
		cancel() {
			internal.state = "cancelled";
		},
	});

	let index = 0;
	function enqueue(value = (index += 1)) {
		try {
			controller.enqueue(value);
			internal.queue.push(value);
		} catch (error) {
			unhandledError = error;
		}
	}
	function close() {
		try {
			internal.state = "closed";
			controller.close();
		} catch (error) {
			unhandledError = error;
		}
	}
	function error(error: unknown = new Error("Uh oh.")) {
		try {
			internal.state = "error";
			internal.error = error;
			controller.error(error);
		} catch (error) {
			unhandledError = error;
		}
	}

	// Reader
	const reader = stream.getReader();
	let latest:
		| { pending: true }
		| { resolved: { done: false; value: number } | { done: true } }
		| { rejected: unknown }
		| null = $state(null);

	async function read() {
		if (latest && ("pending" in latest || "rejected" in latest)) {
			return;
		}
		try {
			latest = { pending: true };
			const resolved = await reader.read();
			internal.queue.shift();
			latest = { resolved };
		} catch (error) {
			latest = { rejected: error };
		}
	}
	function cancel() {
		try {
			reader.cancel();
			internal.queue = [];
		} catch (error) {
			unhandledError = error;
		}
	}

	function capitalize(value: string): string {
		return value[0]?.toUpperCase() + value.slice(1);
	}
</script>

<div class="readable-stream-example">
	<section>
		<h3>
			ReadableStream <span class="state" data-state={internal.state}
				>{capitalize(internal.state)}</span
			>
		</h3>
		<div class="details">
			<ul class="queue">
				{#each internal.queue as item}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
		<div class="actions">
			<button onclick={() => enqueue()}>Enqueue</button>
			<button onclick={close}>Close</button>
			<button onclick={() => error()}>Error</button>
		</div>
	</section>

	<section>
		<h3>Reader</h3>
		<div class="details">
			<pre>{JSON.stringify(
					$state.snapshot({ latest, unhandledError }),
					(key, value) =>
						value instanceof Error ? { message: value.message } : value,
					2,
				)}</pre>
		</div>
		<div class="actions">
			<button onclick={cancel}>Cancel</button>
			<button onclick={read}>Read</button>
		</div>
	</section>
</div>

<style>
	.readable-stream-example {
		display: flex;
		flex-direction: row;
		gap: 1.5rem;
		font-family: var(--font-family-monospace);
		font-size: 90%;
	}

	section {
		flex: 1;
		display: flex;
		flex-direction: column;
		border: solid 1px var(--color-azure-700);
	}
	h3 {
		margin: 0;
		padding: 0.5rem;
		font-family: var(--font-family-monospace);
		font-size: 0.9rem;
		font-weight: 400;
		background-color: var(--color-azure-700);
		color: var(--primary-inverse);
	}
	.state {
		margin-left: 1rem;
		font-size: 80%;
	}
	.state::before {
		content: "";
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		margin-right: 0.3rem;
		border-radius: calc(0.6rem / 2);
		background-color: var(--color-slate-100);
		border: solid 1px var(--color-slate-700);
	}
	.state[data-state="started"]::before {
		background-color: var(--color-jade-500);
	}
	.state[data-state="closed"]::before {
		background-color: var(--color-red-500);
	}
	.details {
		flex: 1;
	}
	.actions {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0.5rem;
		gap: 0.5rem;
	}

	.queue {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-height: 3.5rem;
		margin: 0;
		padding: 0.5rem;
	}
	.queue li {
		width: 2rem;
		height: 2rem;
		list-style: none;
		line-height: 2rem;
		text-align: center;
		background-color: var(--color-slate-500);
	}
</style>
