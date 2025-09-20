// @ts-check
import { defineConfig } from "astro/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import svelte from "@astrojs/svelte";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
    markdown: {
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
        shikiConfig: {
            themes: {
                light: "github-light",
                dark: "github-dark",
            },
        },
    },
    redirects: {
        "/articles/freebody/vectors": "/articles/vectors",
    },
    integrations: [svelte(), mdx()],
    site: "https://timhall.github.io",
});