/**
 * Tests for ObsidianVaultFileSystem
 *
 * Uses a mock Obsidian App to test the vault filesystem adapter
 * without requiring a real Obsidian instance.
 *
 * The mock TFile/TFolder instances are imported from obsidian-mock.ts so that
 * instanceof checks in vault-fs.ts resolve correctly.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ObsidianVaultFileSystem } from "../src/vault-fs";
// These come from the obsidian alias → test/obsidian-mock.ts
import { TFile, TFolder } from "obsidian";

// ── Mock App factory ─────────────────────────────────────────────────────────

function makeApp(files: Record<string, string> = {}) {
	const fileMap: Record<string, TFile & { content: string }> = {};
	const folderMap: Record<string, TFolder> = {};

	// Build file map from initial fixture
	for (const [path, content] of Object.entries(files)) {
		const name = path.split("/").pop()!;
		const f = new TFile(path, name) as TFile & { content: string };
		f.content = content;
		fileMap[path] = f;
	}

	// Helper: build a folder whose children are all files under that prefix
	function buildFolder(folderPath: string): TFolder {
		const children: (TFile | TFolder)[] = Object.values(fileMap).filter((f) => {
			const parent = f.path.split("/").slice(0, -1).join("/");
			return parent === folderPath;
		});
		return new TFolder(folderPath, folderPath.split("/").pop() ?? "", children);
	}

	const vault = {
		getAbstractFileByPath: vi.fn((path: string): TFile | TFolder | null => {
			if (fileMap[path]) return fileMap[path];
			if (folderMap[path]) return folderMap[path];
			// Auto-build folder if any files live directly inside it
			const hasChildren = Object.values(fileMap).some((f) => {
				const parent = f.path.split("/").slice(0, -1).join("/");
				return parent === path;
			});
			if (hasChildren) return buildFolder(path);
			return null;
		}),
		getRoot: vi.fn((): TFolder => {
			const rootChildren = Object.values(fileMap).filter((f) => !f.path.includes("/"));
			return new TFolder("", "/", rootChildren);
		}),
		read: vi.fn(async (file: TFile & { content?: string }) => file.content ?? ""),
		modify: vi.fn(async (file: TFile & { content?: string }, content: string) => {
			file.content = content;
		}),
		create: vi.fn(async (path: string, content: string) => {
			const name = path.split("/").pop()!;
			const f = new TFile(path, name) as TFile & { content: string };
			f.content = content;
			fileMap[path] = f;
			return f;
		}),
		delete: vi.fn(async (file: TFile) => {
			delete fileMap[file.path];
		}),
		createFolder: vi.fn(async (path: string) => {
			folderMap[path] = new TFolder(path, path.split("/").pop()!, []);
		}),
	};

	return { vault, _fileMap: fileMap, _folderMap: folderMap };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ObsidianVaultFileSystem", () => {
	describe("readFile", () => {
		it("reads existing file content", async () => {
			const app = makeApp({ "weeks/13.md": "# Week 13\n- [ ] Task" });
			const fs = new ObsidianVaultFileSystem(app as any);
			const content = await fs.readFile("weeks/13.md");
			expect(content).toBe("# Week 13\n- [ ] Task");
		});

		it("normalizes CRLF to LF on read", async () => {
			const app = makeApp({ "weeks/13.md": "line1\r\nline2\r\nline3" });
			const fs = new ObsidianVaultFileSystem(app as any);
			const content = await fs.readFile("weeks/13.md");
			expect(content).toBe("line1\nline2\nline3");
		});

		it("throws when file does not exist", async () => {
			const app = makeApp({});
			const fs = new ObsidianVaultFileSystem(app as any);
			await expect(fs.readFile("weeks/missing.md")).rejects.toThrow("File not found: weeks/missing.md");
		});
	});

	describe("writeFile", () => {
		it("modifies an existing file", async () => {
			const app = makeApp({ "weeks/13.md": "old content" });
			const fs = new ObsidianVaultFileSystem(app as any);
			await fs.writeFile("weeks/13.md", "new content");
			expect(app.vault.modify).toHaveBeenCalledOnce();
			expect(app.vault.create).not.toHaveBeenCalled();
		});

		it("creates a new file when it does not exist", async () => {
			const app = makeApp({});
			// Pre-create folder so _ensureFolder doesn't try to create it
			app._folderMap["weeks"] = new TFolder("weeks", "weeks", []);
			const fs = new ObsidianVaultFileSystem(app as any);
			await fs.writeFile("weeks/14.md", "# Week 14");
			expect(app.vault.create).toHaveBeenCalledWith("weeks/14.md", "# Week 14");
		});
	});

	describe("deleteFile", () => {
		it("deletes an existing file", async () => {
			const app = makeApp({ "weeks/13.md": "content" });
			const fs = new ObsidianVaultFileSystem(app as any);
			await fs.deleteFile("weeks/13.md");
			expect(app.vault.delete).toHaveBeenCalledOnce();
		});

		it("is a silent no-op when file does not exist", async () => {
			const app = makeApp({});
			const fs = new ObsidianVaultFileSystem(app as any);
			await expect(fs.deleteFile("weeks/missing.md")).resolves.toBeUndefined();
			expect(app.vault.delete).not.toHaveBeenCalled();
		});
	});

	describe("listFiles", () => {
		it("lists files in a directory", async () => {
			const app = makeApp({
				"weeks/13.md": "",
				"weeks/14.md": "",
				"weeks/template.md": "",
			});
			const fs = new ObsidianVaultFileSystem(app as any);
			const files = await fs.listFiles("weeks");
			expect(files).toHaveLength(3);
			expect(files).toContain("13.md");
			expect(files).toContain("14.md");
			expect(files).toContain("template.md");
		});

		it("returns filenames only (not full paths)", async () => {
			const app = makeApp({ "weeks/13.md": "" });
			const fs = new ObsidianVaultFileSystem(app as any);
			const files = await fs.listFiles("weeks");
			expect(files[0]).toBe("13.md");
			expect(files[0]).not.toContain("/");
		});

		it("returns empty array for missing directory", async () => {
			const app = makeApp({});
			const fs = new ObsidianVaultFileSystem(app as any);
			const files = await fs.listFiles("nonexistent");
			expect(files).toEqual([]);
		});

		it("lists root files when given empty string", async () => {
			const app = makeApp({ "template.md": "", "backlog.md": "" });
			const fs = new ObsidianVaultFileSystem(app as any);
			const files = await fs.listFiles("");
			expect(files).toContain("template.md");
			expect(files).toContain("backlog.md");
		});
	});

	describe("exists", () => {
		it("returns true for existing file", async () => {
			const app = makeApp({ "weeks/13.md": "content" });
			const fs = new ObsidianVaultFileSystem(app as any);
			expect(await fs.exists("weeks/13.md")).toBe(true);
		});

		it("returns false for missing file", async () => {
			const app = makeApp({});
			const fs = new ObsidianVaultFileSystem(app as any);
			expect(await fs.exists("weeks/missing.md")).toBe(false);
		});

		it("returns false for a folder path", async () => {
			const app = makeApp({});
			app._folderMap["weeks"] = new TFolder("weeks", "weeks", []);
			const fs = new ObsidianVaultFileSystem(app as any);
			expect(await fs.exists("weeks")).toBe(false);
		});
	});
});
