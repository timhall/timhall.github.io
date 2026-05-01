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
		color: var(--color);
		font-size: 0.85rem;
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}

	/* Components */

	.ascii-form :global {
		fieldset {
			border: solid max(1px, 0.14em) light-dark(var(--color-slate-500), var(--color-slate-600));
		}

		button {
			font-family: var(--font-family-monospace);
			color: var(--color);
			border: none;
			background: none;
			cursor: pointer;
			box-shadow:
				1px 0 0 light-dark(var(--color-slate-200), var(--color-slate-700)),
				0 2px 0 light-dark(var(--color-slate-400), var(--color-slate-500)),
				-1px 0 0 light-dark(var(--color-slate-200), var(--color-slate-700)),
				0 -1px 0 light-dark(var(--color-slate-200), var(--color-slate-700));
			padding: var(--spacing-s) var(--spacing-m);
		}
		button:active {
			box-shadow:
				inset 0 1px 0 light-dark(var(--color-slate-400), var(--color-slate-500)),
				inset 1px 0 0 light-dark(var(--color-slate-200), var(--color-slate-700)),
				inset -1px -1px 0 light-dark(var(--color-slate-200), var(--color-slate-700));
		}
	}
</style>
