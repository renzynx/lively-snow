import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["server/**/*.ts"],
  outDir: "dist",
  format: ["esm"],
  outExtension: () => ({ js: ".mjs" }),
  target: "es2020",
  splitting: false,
  clean: true,
  dts: false,
});
