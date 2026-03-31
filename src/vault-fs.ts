import { App, normalizePath, TFile, TFolder } from "obsidian";
import type { IFileSystem } from "switch-next-week/lib";

/**
 * ObsidianVaultFileSystem
 *
 * Implements IFileSystem from switch-next-week/lib for use in an Obsidian plugin.
 * All paths are vault-relative (e.g. "weeks/13.md"). normalizePath() is called
 * before every vault API call to handle platform differences.
 *
 * Matches NodeFileSystem behavior:
 * - CRLF → LF normalization on read
 * - Silent no-op on deleteFile if file doesn't exist
 * - Empty array for listFiles on missing directory
 */
export class ObsidianVaultFileSystem implements IFileSystem {
	constructor(private app: App) {}

	async readFile(filePath: string): Promise<string> {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(filePath));
		if (!(file instanceof TFile)) {
			throw new Error(`File not found: ${filePath}`);
		}
		const content = await this.app.vault.read(file);
		return content.replace(/\r\n/g, "\n"); // match NodeFileSystem CRLF normalization
	}

	async writeFile(filePath: string, content: string): Promise<void> {
		const normalized = normalizePath(filePath);
		const existing = this.app.vault.getAbstractFileByPath(normalized);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
		} else {
			const folderPath = normalized.split("/").slice(0, -1).join("/");
			await this._ensureFolder(folderPath);
			await this.app.vault.create(normalized, content);
		}
	}

	async deleteFile(filePath: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(filePath));
		if (file instanceof TFile) {
			await this.app.vault.delete(file);
		}
		// silent no-op if missing — matches NodeFileSystem
	}

	async listFiles(dirPath: string): Promise<string[]> {
		const normalized = normalizePath(dirPath);
		const folder =
			normalized === "" || normalized === "."
				? this.app.vault.getRoot()
				: this.app.vault.getAbstractFileByPath(normalized);
		if (!(folder instanceof TFolder)) return [];
		return folder.children
			.filter((c): c is TFile => c instanceof TFile)
			.map((c) => c.name); // filename only, e.g. "13.md"
	}

	async exists(filePath: string): Promise<boolean> {
		return (
			this.app.vault.getAbstractFileByPath(normalizePath(filePath)) instanceof TFile
		);
	}

	private async _ensureFolder(folderPath: string): Promise<void> {
		if (!folderPath) return;
		const existing = this.app.vault.getAbstractFileByPath(folderPath);
		if (!(existing instanceof TFolder)) {
			await this.app.vault.createFolder(folderPath);
		}
	}
}
