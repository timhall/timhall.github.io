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
</script>

<div class="readable-stream-example">
	<button onclick={() => enqueue()}>Enqueue</button>
	<button onclick={close}>Close</button>
	<button onclick={cancel}>Cancel</button>
	<button onclick={() => error()}>Error</button>
	<button onclick={read}>Read</button>

	<pre>{JSON.stringify(
			$state.snapshot({ internal, latest, unhandledError }),
			(key, value) =>
				value instanceof Error ? { message: value.message } : value,
			2,
		)}</pre>
</div>

<style>
	.readable-stream-example {
		font-family: var(--pico-font-family-monospace);
	}
</style>
