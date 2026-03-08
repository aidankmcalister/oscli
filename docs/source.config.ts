import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import {
  oscliDarkTheme,
  oscliLanguage,
  oscliLightTheme,
} from "./lib/shiki-oscli";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      themes: {
        light: oscliLightTheme,
        dark: oscliDarkTheme,
      },
      langs: [oscliLanguage],
    },
  },
});
