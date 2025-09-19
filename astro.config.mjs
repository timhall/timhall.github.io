// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	redirects: {
		"/articles/freebody/vectors": "/articles/vectors",
	},
	integrations: [],
});
