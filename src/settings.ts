import { AbstractInputSuggest, App, PluginSettingTab, Setting, TFile, TFolder } from "obsidian";
import type SwitchNextWeekPlugin from "./main";

class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(app: App, private inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	getSuggestions(query: string): TFolder[] {
		return this.app.vault
			.getAllFolders(false)
			.filter(f => f.path.toLowerCase().includes(query.toLowerCase()))
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.trigger("input");
		this.close();
	}
}

/**
 * Autocomplete over markdown files in the vault.
 *
 * When `baseDir` is provided, suggestions are limited to files under that folder
 * and the stored value is RELATIVE to it (so it round-trips with settings that
 * prefix the weeks folder, like the backlog). Without `baseDir`, suggestions
 * span the whole vault and the stored value is the full vault path (used by the
 * sub-sphere model file, which typically lives outside the weeks folder).
 */
class FileSuggest extends AbstractInputSuggest<TFile> {
	constructor(
		app: App,
		private inputEl: HTMLInputElement,
		private baseDir?: () => string
	) {
		super(app, inputEl);
	}

	/** Normalized base folder; "" (also "." or unset) means the whole vault / full paths. */
	private base(): string {
		const b = (this.baseDir ? this.baseDir() : "").trim();
		return b === "." ? "" : b.replace(/\/+$/, "");
	}

	/** Path as shown and stored: relative to base when set, otherwise the full vault path. */
	private displayPath(file: TFile): string {
		const base = this.base();
		if (base && file.path.startsWith(base + "/")) {
			return file.path.slice(base.length + 1);
		}
		return file.path;
	}

	getSuggestions(query: string): TFile[] {
		const base = this.base();
		const q = query.toLowerCase();
		return this.app.vault
			.getMarkdownFiles()
			.filter((f) => (base ? f.path === base || f.path.startsWith(base + "/") : true))
			.filter((f) => this.displayPath(f).toLowerCase().includes(q))
			.sort((a, b) => this.displayPath(a).localeCompare(this.displayPath(b)))
			.slice(0, 50);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(this.displayPath(file));
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = this.displayPath(file);
		this.inputEl.trigger("input");
		this.close();
	}
}

export interface SwitchNextWeekSettings {
	weeksDir: string;
	templatesDir: string;
	backlogFile: string;
	spheresFile: string;  // full vault-relative path to the sub-sphere model file; "" = feature off
	weekEndDay: number;   // 0=Sunday … 6=Saturday
	weekEndHour: number;  // 0–23
	openFileAfterRun: boolean;
}

export const DEFAULT_SETTINGS: SwitchNextWeekSettings = {
	weeksDir: "weeks",
	templatesDir: "templates",
	backlogFile: "backlog.md",
	spheresFile: "",
	weekEndDay: 0,
	weekEndHour: 20,
	openFileAfterRun: true,
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Returns null if valid, or an error message string. */
export function validateSettings(s: SwitchNextWeekSettings): string | null {
	if (!s.weeksDir.trim()) return "Weeks folder cannot be empty.";
	if (!s.templatesDir.trim()) return "Templates folder cannot be empty.";
	if (!s.backlogFile.trim()) return "Backlog file cannot be empty.";
	if (!Number.isInteger(s.weekEndHour) || s.weekEndHour < 0 || s.weekEndHour > 23)
		return "Week end hour must be an integer between 0 and 23.";
	return null;
}

export class SwitchNextWeekSettingTab extends PluginSettingTab {
	plugin: SwitchNextWeekPlugin;
	private errorEl: HTMLElement | null = null;

	constructor(app: App, plugin: SwitchNextWeekPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private showError(msg: string | null): void {
		if (!this.errorEl) return;
		if (msg) {
			this.errorEl.setText("⚠ " + msg);
			this.errorEl.style.display = "block";
		} else {
			this.errorEl.style.display = "none";
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Validation error banner (hidden by default)
		this.errorEl = containerEl.createEl("p", { cls: "snw-settings-error" });
		this.errorEl.style.display = "none";

		const saveValidated = async () => {
			const err = validateSettings(this.plugin.settings);
			this.showError(err);
			if (!err) await this.plugin.saveSettings();
		};

		new Setting(containerEl)
			.setName("Weeks folder")
			.setDesc("Vault folder containing week files (e.g. @Weekly)")
			.addText((text) => {
				text
					.setPlaceholder("weeks")
					.setValue(this.plugin.settings.weeksDir)
					.onChange(async (value) => {
						this.plugin.settings.weeksDir = value.trim();
						await saveValidated();
					});
				new FolderSuggest(this.app, text.inputEl);
			});

		new Setting(containerEl)
			.setName("Templates folder")
			.setDesc("Vault folder containing template.md, monthly.md, weekly.md, calendar.md, yearly.md")
			.addText((text) => {
				text
					.setPlaceholder("templates")
					.setValue(this.plugin.settings.templatesDir)
					.onChange(async (value) => {
						this.plugin.settings.templatesDir = value.trim();
						await saveValidated();
					});
				new FolderSuggest(this.app, text.inputEl);
			});

		new Setting(containerEl)
			.setName("Backlog file")
			.setDesc("Path within weeks folder for one-time task backlog (e.g. backlog.md)")
			.addText((text) => {
				text
					.setPlaceholder("backlog.md")
					.setValue(this.plugin.settings.backlogFile)
					.onChange(async (value) => {
						this.plugin.settings.backlogFile = value.trim();
						await saveValidated();
					});
				new FileSuggest(this.app, text.inputEl, () => this.plugin.settings.weeksDir);
			});

		new Setting(containerEl)
			.setName("Sub-sphere model file")
			.setDesc(
				"Optional. Full vault path to the sub-sphere model file (e.g. @Strategy/Сферы и подсферы.md). " +
				"Leave empty to disable sub-sphere routing. If the file is missing, run the " +
				"\"Create sub-sphere model file\" command to generate a starter."
			)
			.addText((text) => {
				text
					.setPlaceholder("@Strategy/Сферы и подсферы.md")
					.setValue(this.plugin.settings.spheresFile)
					.onChange(async (value) => {
						this.plugin.settings.spheresFile = value.trim();
						await saveValidated();
					});
				new FileSuggest(this.app, text.inputEl);
			});

		new Setting(containerEl)
			.setName("Week ends on")
			.setDesc("Day of the week when the current week ends")
			.addDropdown((dropdown) => {
				DAY_NAMES.forEach((name, idx) => dropdown.addOption(String(idx), name));
				dropdown.setValue(String(this.plugin.settings.weekEndDay));
				dropdown.onChange(async (value) => {
					this.plugin.settings.weekEndDay = parseInt(value, 10);
					await saveValidated();
				});
			});

		new Setting(containerEl)
			.setName("Week end hour")
			.setDesc("Hour (0–23) at which the week ends on the configured day")
			.addText((text) => {
				text
					.setPlaceholder("20")
					.setValue(String(this.plugin.settings.weekEndHour))
					.onChange(async (value) => {
						const h = parseInt(value, 10);
						this.plugin.settings.weekEndHour = isNaN(h) ? -1 : h;
						await saveValidated();
					});
				text.inputEl.style.width = "60px";
			});

		new Setting(containerEl)
			.setName("Open week file after run")
			.setDesc("Automatically open the current week file after running")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.openFileAfterRun)
					.onChange(async (value) => {
						this.plugin.settings.openFileAfterRun = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
