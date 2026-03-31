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

export class SwitchNextWeekSettingTab extends PluginSettingTab {
	plugin: SwitchNextWeekPlugin;

	constructor(app: App, plugin: SwitchNextWeekPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Weeks folder")
			.setDesc("Vault folder containing week files (e.g. weeks)")
			.addText((text) =>
				text
					.setPlaceholder("weeks")
					.setValue(this.plugin.settings.weeksDir)
					.onChange(async (value) => {
						this.plugin.settings.weeksDir = value.trim() || "weeks";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Template file")
			.setDesc("Filename for recurring weekly tasks (default: template.md)")
			.addText((text) =>
				text
					.setPlaceholder("template.md")
					.setValue(this.plugin.settings.templateFile)
					.onChange(async (value) => {
						this.plugin.settings.templateFile = value.trim() || "template.md";
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Backlog file")
			.setDesc("Filename for one-time task backlog (default: backlog.md)")
			.addText((text) =>
				text
					.setPlaceholder("backlog.md")
					.setValue(this.plugin.settings.backlogFile)
					.onChange(async (value) => {
						this.plugin.settings.backlogFile = value.trim() || "backlog.md";
						await this.plugin.saveSettings();
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
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Week end hour")
			.setDesc("Hour (0–23) at which the week ends on the configured day")
			.addText((text) =>
				text
					.setPlaceholder("20")
					.setValue(String(this.plugin.settings.weekEndHour))
					.onChange(async (value) => {
						const h = parseInt(value, 10);
						if (!isNaN(h) && h >= 0 && h <= 23) {
							this.plugin.settings.weekEndHour = h;
							await this.plugin.saveSettings();
						}
					})
			);

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
