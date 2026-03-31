import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
	},
	resolve: {
		alias: {
			// Mock the Obsidian API for tests — not available in Node.js
			obsidian: path.resolve(__dirname, "test/obsidian-mock.ts"),
		},
	},
});
