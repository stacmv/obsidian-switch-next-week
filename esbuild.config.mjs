import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

esbuild.build({
	entryPoints: ["src/main.ts"],
	bundle: true,
	platform: "browser",       // Must work on Android (no Electron/Node.js)
	alias: {
		path: "path-browserify",  // Polyfill path module for Android compatibility
		fs: "./src/fs-stub.js",   // Stub fs — NodeFileSystem is never used in the plugin
	},
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
	],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	minify: prod,
	outfile: "main.js",
}).catch(() => process.exit(1));
