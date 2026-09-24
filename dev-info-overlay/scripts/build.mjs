import { copyFileSync } from "node:fs";
import { build } from "tsup";

const shared = {
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: ["react", "react-dom", "react/jsx-runtime"]
};

await build({
  ...shared,
  entry: { index: "src/index.ts" },
  clean: true,
  esbuildOptions(options) {
    options.banner = { js: '"use client";' };
  }
});

await build({
  ...shared,
  entry: { server: "src/server.ts" },
  clean: false,
  external: ["react", "react-dom"]
});

copyFileSync("src/styles.css", "dist/styles.css");
