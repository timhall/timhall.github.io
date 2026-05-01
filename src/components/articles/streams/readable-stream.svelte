<script lang="ts">
	import ASCIIForm from "../../ui/ASCIIForm.svelte";
	import ASCIIConnector from "../../ui/ASCIIConnector.svelte";

	class ControlledReadableStream<TValue> extends ReadableStream<TValue> {
		controller: ReadableStreamDefaultController<TValue>;
		state: {
			locked: boolean;
			closed: boolean;
			errored: boolean;
			queue: TValue[];
			error: unknown | null;
		} = $state({
			locked: true,
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
					this.state.locked = this.locked;
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

				this.state.locked = this.locked;
				this.state.closed = true;
			} catch (error) {
				this.failures.push(error as Error);
			}
		}

		error(error: unknown) {
			try {
				this.controller.error(error);

				this.state.locked = this.locked;
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

	let index = $state(0);
	let latest: PromiseState<
		{ done: false; value: number } | { done: true }
	> | null = $state(null);
	let failures: Error[] = $state([]);

	function wrapText(text: string, maxLength: number = 80): string {
		if (text.length <= maxLength) return text;

		const words = text.split(" ");
		const lines: string[] = [];
		let currentLine = "";

		for (const word of words) {
			if (currentLine.length + word.length + 1 <= maxLength) {
				currentLine = currentLine ? `${currentLine} ${word}` : word;
			} else {
				if (currentLine) lines.push(currentLine);
				currentLine = word;
			}
		}
		if (currentLine) lines.push(currentLine);

		return lines.join("\n");
	}

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

	async function cancel() {
		if (!reader) return;

		try {
			await reader.cancel();
			readable.state.locked = readable.locked;
		} catch (error) {
			failures.push(error as Error);
		}
	}

	const latestValue = $derived(
		latest?.status === "resolved"
			? `{\n  value: ${latest.value.value},\n  done: ${latest.value.done}\n}`
			: latest?.status === "rejected"
				? latest.error
				: null,
	);
	const latestRead = $derived(
		wrapText(
			`value = ${
				!latest
					? "null"
					: `Promise {<${latest.status}>${latestValue ? `: ${latestValue}` : ""}}`
			}`,
			80,
		),
	);
</script>

<div class="readable-stream-example">
	<ASCIIForm direction="vertical">
		<fieldset>
			<legend>ReadableStream</legend>

			<section>
				<div class="values">
					.locked = {readable.state.locked}
				</div>
				<div class="actions">
					<button onclick={() => readable.enqueue((index += 1))}>
						.enqueue(#)
					</button>
					<button onclick={() => readable.close()}>.close()</button>
					<button onclick={() => readable.error(new Error("Uh oh"))}
						>.error()</button
					>
				</div>
			</section>

			<hr />
			<section>
				<div>queue = [{readable.state.queue.join(", ")}]</div>
			</section>

			{#if readable.failures.length}
				<hr />
				<section>
					{#each readable.failures as failure}
						<div>- {failure.message}</div>
					{/each}
				</section>
			{/if}
		</fieldset>

		<div class="connector">
			<ASCIIConnector text=".getReader()" />
		</div>

		<fieldset>
			<legend>Reader</legend>

			<section>
				<div class="actions">
					<button onclick={cancel}>.cancel()</button>
					<button onclick={read}>.read()</button>
					<button
						onclick={() => {
							reader?.releaseLock();
							readable.state.locked = readable.locked;
						}}>.releaseLock()</button
					>
				</div>
			</section>

			<hr />
			<section>
				<pre>{latestRead}</pre>
			</section>

			{#if failures.length}
				<section>
					{#each failures as failure}
						<div>- {failure.message}</div>
					{/each}
				</section>
			{/if}
		</fieldset>

		<button class="reset" onclick={reset}>Reset</button>
	</ASCIIForm>
</div>

<style>
	.readable-stream-example {
		color: var(--color);
	}

	section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-m);
	}

	hr {
		border: solid 1px light-dark(var(--color-slate-400), var(--color-slate-600));
	}

	pre {
		background: none;
		border: none;
		color: inherit;
		font: inherit;
	}

	.connector {
		margin-top: var(--spacing-m);
	}

	.reset {
		margin-top: var(--spacing-m);
		align-self: center;
	}
</style>
