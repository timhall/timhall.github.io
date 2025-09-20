import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const articles = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/articles" }),
	schema: z.object({
		title: z.string(),
		slug: z.string().optional().nullable(),
		publishedAt: z.date().optional().nullable(),
		updatedAt: z.date().optional().nullable(),
	}),
});

export const collections = { articles };
