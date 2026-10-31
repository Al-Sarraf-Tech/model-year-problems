import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as yaml from "js-yaml";
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import { absUrl, jsonld, pageSchema } from "./src/lib/schema.js";
import { prettyDate } from "./src/lib/data.js";
import { prettyComponent } from "./src/lib/components.js";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const cssHash = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, "src/assets/style.css"))).digest("hex").slice(0, 8);

export default function (eleventyConfig) {
  eleventyConfig.addDataExtension("yaml,yml", (contents) => yaml.load(contents, { schema: yaml.CORE_SCHEMA }));
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // GitHub Pages reads CNAME from the published site and serves the custom domain.
  eleventyConfig.addPassthroughCopy({ CNAME: "CNAME" });
  eleventyConfig.addGlobalData("cssFile", `/assets/style.${cssHash}.css`);

  eleventyConfig.addFilter("pageSchema", pageSchema);
  eleventyConfig.addFilter("jsonld", jsonld);
  eleventyConfig.addFilter("absUrl", absUrl);
  eleventyConfig.addFilter("prettyDate", prettyDate);
  eleventyConfig.addFilter("comp", (s) => prettyComponent(String(s || "").split(":")[0]));
  eleventyConfig.addFilter("subcomp", (s) => String(s || "").split(":").slice(1).join(": ").toLowerCase());
  eleventyConfig.addFilter("n", (x) => Number(x || 0).toLocaleString("en-US"));
  eleventyConfig.addFilter("barw", (count, max) => (max ? Math.max(1, Math.round((count / max) * 100)) : 0));
  eleventyConfig.addFilter("maxOf", (arr, key) => Math.max(0, ...arr.map((x) => (key ? key.split(".").reduce((o, k) => o?.[k], x) : x) || 0)));

  eleventyConfig.on("eleventy.after", (arg) => {
    const siteDir = typeof arg === "string" ? arg : arg.dir.output;
    const css = path.join(siteDir, "assets/style.css");
    if (fs.existsSync(css)) fs.copyFileSync(css, path.join(siteDir, `assets/style.${cssHash}.css`));
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    pathPrefix: process.env.PATH_PREFIX || "/",
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
