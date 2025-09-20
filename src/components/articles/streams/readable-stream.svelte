<script>
	let controller;
	const stream = new ReadableStream({
		start(_controller) {
			controller = _controller;
		},
	});

	let index = 0;
	let buffer = [];
	let closed = false;
	function enqueue() {
		const value = (index += 1);

		controller.enqueue(value);
		buffer.push(value);
		buffer = buffer;
	}
	function close() {
		closed = true;
		controller.close();
	}

	const reader = stream.getReader();
	let results = [];

	async function read() {
		const result = await reader.read();

		buffer.shift();
		buffer = buffer;

		results.push(result);
		results = results;
	}
</script>

<div>
	<h3>Controller</h3>
	<button onclick={enqueue} disabled={closed}>Enqueue</button>
	<button onclick={close} disabled={closed}>Close</button>
</div>

<div>
	<h3>State</h3>

	Closed: {closed}

	Buffer:
	<ul>
		{#each buffer as value}
			<li>{value}</li>
		{/each}
	</ul>
</div>

<div>
	<h3>Reader</h3>

	<button onclick={read}>Read</button>

	Values:
	<ul>
		{#each results as result}
			<li>{JSON.stringify(result)}</li>
		{/each}
	</ul>
</div>
