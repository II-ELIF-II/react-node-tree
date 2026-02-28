import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/node-tree.css"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: false,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
});
