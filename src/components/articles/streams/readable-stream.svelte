<script lang="ts">
	class ControlledReadableStream<TValue> extends ReadableStream<TValue> {
		controller: ReadableStreamDefaultController<TValue>;
		state: {
			closed: boolean;
			errored: boolean;
			queue: TValue[];
			error: unknown | null;
		} = $state({
			closed: false,
			errored: false,
			queue: [],
			error: null,
		});
		failures: Error[] = $state([]);

		constructor() {
			let readableController: ReadableStreamDefaultController<TValue>;
			super({
				start(controller) {
					readableController = controller;
				},
				cancel: () => {
					this.state.closed = true;
					this.state.queue = [];
				},
			});
			this.controller = readableController!;
		}

		enqueue(value: TValue) {
			try {
				this.controller.enqueue(value);
				this.state.queue.push(value);
			} catch (error) {
				this.failures.push(error as Error);
			}
		}

		close() {
			try {
				this.controller.close();
				this.state.closed = true;
			} catch (error) {
				this.failures.push(error as Error);
			}
		}

		error(error: unknown) {
			try {
				this.controller.error(error);
				this.state.closed = true;
				this.state.errored = true;
				this.state.queue = [];
				this.state.error = error;
			} catch (error) {
				this.failures.push(error as Error);
			}
		}
	}

	type PromiseState<TValue> =
		| { status: "pending" }
		| { status: "resolved"; value: TValue }
		| { status: "rejected"; error: unknown };

	let index = 0;
	let latest: PromiseState<
		{ done: false; value: number } | { done: true }
	> | null = $state(null);
	let failures: Error[] = $state([]);

	let readable: ControlledReadableStream<number> = $state(
		new ControlledReadableStream<number>(),
	);
	let reader: ReadableStreamDefaultReader<number> = $derived(
		readable.getReader(),
	);

	function reset() {
		reader.releaseLock();
		readable = new ControlledReadableStream<number>();

		index = 0;
		latest = null;
		failures = [];
	}

	async function read() {
		if (latest?.status === "pending") {
			return;
		}

		let reading;
		try {
			reading = reader.read();
		} catch (error) {
			failures.push(error as Error);
			return;
		}

		try {
			latest = { status: "pending" };
			const value = await reading;
			readable.state.queue.shift();
			latest = { status: "resolved", value };
		} catch (error) {
			latest = { status: "rejected", error };
		}
	}
	function cancel() {
		if (!reader) return;

		try {
			reader.cancel();
		} catch (error) {
			console.log("FAILURE", error);
			failures.push(error as Error);
		}
	}
</script>

<div class="readable-stream-example">
	<button onclick={reset}>Reset</button>
	<div class="sections">
		<section>
			<h3>
				ReadableStream <span
					class="state"
					data-closed={readable.state.closed ? "closed" : undefined}
					>{readable.state.closed ? "Closed" : "Started"}</span
				>
			</h3>
			<div class="actions">
				<button onclick={() => readable.enqueue((index += 1))}>Enqueue</button>
				<button onclick={() => readable.close()}>Close</button>
				<button onclick={() => readable.error(new Error("Uh oh."))}
					>Error</button
				>
			</div>
			<div class="details">
				<ul class="queue">
					{#each readable.state.queue as item}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
			{#if readable.failures.length}
				<ul class="failures">
					{#each readable.failures as failure}
						<li>{failure.message}</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section>
			<h3>Reader</h3>
			<div class="actions">
				<button onclick={cancel}>Cancel</button>
				<button onclick={read}>Read</button>
			</div>
			<div class="details">
				<pre>{JSON.stringify(
						$state.snapshot({
							latest,
						}),
						(key, value) =>
							value instanceof Error ? { message: value.message } : value,
						2,
					)}</pre>
			</div>
			{#if failures.length}
				<ul class="failures">
					{#each failures as failure}
						<li>{failure.message}</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>

<style>
	.readable-stream-example {
		font-family: var(--font-family-monospace);
		font-size: 90%;
	}
	button {
		font-size: 90%;
		padding: 0.25rem 0.5rem;
	}

	.sections {
		display: flex;
		flex-direction: row;
		gap: 1.5rem;
		margin-top: 0.25rem;
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
		background-color: var(--color-jade-500);
		border: solid 1px var(--color-slate-700);
	}
	.state[data-closed]::before {
		background-color: var(--color-red-500);
	}
	.details {
		flex: 1;
	}
	.actions {
		display: flex;
		flex-direction: row;
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
		margin-bottom: 0;
		line-height: 2rem;
		text-align: center;
		background-color: var(--color-slate-100);
	}

	.failures {
		margin: 0;
		padding: 0;
	}
	.failures li {
		list-style: none;
		margin-bottom: 0;
		padding: 0.5rem;
		font-size: 80%;
		color: var(--color-red-500);
		background-color: var(--color-red-100);
	}
	.failures li + li {
		border-top: solid 1px var(--color-red-500);
	}
</style>
