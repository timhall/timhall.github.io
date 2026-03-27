<script lang="ts">
	interface Props {
		type?: "vertical" | "horizontal";
		text?: string;
	}

	let { type = "vertical", text = "" }: Props = $props();

	function getConnectorContent(): string {
		switch (type) {
			case "horizontal":
				return text ? `────── ${text} ▶` : `──────────▶`;
			default:
				return text ? `│\n${text}\n│\n▼` : `│\n│\n▼`;
		}
	}
</script>

<div class="ascii-connector" data-type={type}>
	{#each getConnectorContent().split("\n") as line}
		<div class="connector-line">{line}</div>
	{/each}
</div>

<style>
	.ascii-connector {
		font-family: var(--font-family-monospace);
		font-size: 0.8rem;
		line-height: 1.2;
		color: inherit;
		text-align: center;
		user-select: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.connector-line {
		white-space: pre;
		margin: 0.1rem 0;
	}

	[data-type="horizontal"] {
		flex-direction: row;
		align-items: center;
	}
</style>
