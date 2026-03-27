<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<div class="ascii-form {className}">
	{@render children?.()}
</div>

<style>
	.ascii-form {
		font-family: var(--font-family-monospace);
		color: var(--color-slate-800);
		font-size: 0.85rem;
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}

	/* Components */

	.ascii-form :global {
		fieldset {
			border: solid max(1px, 0.14em) var(--color-slate-500);
		}

		button {
			font-family: var(--font-family-monospace);
			color: var(--color-slate-800);
			border: none;
			background: none;
			cursor: pointer;
			box-shadow:
				1px 0 0 var(--color-slate-200),
				0 2px 0 var(--color-slate-400),
				-1px 0 0 var(--color-slate-200),
				0 -1px 0 var(--color-slate-200);
			padding: var(--spacing-s) var(--spacing-m);
		}
		button:active {
			box-shadow:
				inset 0 1px 0 var(--color-slate-400),
				inset 1px 0 0 var(--color-slate-200),
				inset -1px -1px 0 var(--color-slate-200);
		}
	}
</style>
