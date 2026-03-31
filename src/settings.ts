import { App, PluginSettingTab, Setting } from "obsidian";
import type SwitchNextWeekPlugin from "./main";

export interface SwitchNextWeekSettings {
	weeksDir: string;
	templateFile: string;
	backlogFile: string;
	weekEndDay: number;   // 0=Sunday … 6=Saturday
	weekEndHour: number;  // 0–23
	openFileAfterRun: boolean;
}

export const DEFAULT_SETTINGS: SwitchNextWeekSettings = {
	weeksDir: "weeks",
	templateFile: "template.md",
	backlogFile: "backlog.md",
	weekEndDay: 0,
	weekEndHour: 20,
	openFileAfterRun: true,
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Returns null if valid, or an error message string. */
export function validateSettings(s: SwitchNextWeekSettings): string | null {
	if (!s.weeksDir.trim()) return "Weeks folder cannot be empty.";
	if (!s.templateFile.trim()) return "Template file cannot be empty.";
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
			.addText((text) =>
				text
					.setPlaceholder("weeks")
					.setValue(this.plugin.settings.weeksDir)
					.onChange(async (value) => {
						this.plugin.settings.weeksDir = value.trim();
						await saveValidated();
					})
			);

		new Setting(containerEl)
			.setName("Template file")
			.setDesc("Path within weeks folder for recurring tasks (e.g. templates/template.md)")
			.addText((text) =>
				text
					.setPlaceholder("template.md")
					.setValue(this.plugin.settings.templateFile)
					.onChange(async (value) => {
						this.plugin.settings.templateFile = value.trim();
						await saveValidated();
					})
			);

		new Setting(containerEl)
			.setName("Backlog file")
			.setDesc("Path within weeks folder for one-time task backlog (e.g. backlog.md)")
			.addText((text) =>
				text
					.setPlaceholder("backlog.md")
					.setValue(this.plugin.settings.backlogFile)
					.onChange(async (value) => {
						this.plugin.settings.backlogFile = value.trim();
						await saveValidated();
					})
			);

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
