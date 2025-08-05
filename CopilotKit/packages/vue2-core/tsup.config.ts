import { defineConfig, Options } from "tsup";

export default defineConfig((options: Options) => ({
  entry: {
    index: "src/index.ts",
    plugin: "src/plugin.ts",
  },
  format: ["esm", "cjs"],
  dts: false, // Disabled for now due to type compatibility issues
  minify: false,
  external: ["vue"],
  sourcemap: true,
  splitting: false, // Disable code splitting to avoid chunk issues
  bundle: true,
  ...options,
}));
