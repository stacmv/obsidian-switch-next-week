import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { SwitchNextWeekSettings, DEFAULT_SETTINGS, SwitchNextWeekSettingTab, validateSettings } from "./settings";
import { WeekProtocolModal } from "./modal";
import { ObsidianVaultFileSystem } from "./vault-fs";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ConfigManager, WeekManager, dateUtils } = require("switch-next-week/lib") as typeof import("switch-next-week/lib");

export default class SwitchNextWeekPlugin extends Plugin {
	settings: SwitchNextWeekSettings = DEFAULT_SETTINGS;
	private running = false;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("calendar-check", "Switch Next Week", () => this.runProtocol());

		this.addCommand({
			id: "run-week-protocol",
			name: "Run week protocol",
			callback: () => this.runProtocol(),
		});

		this.addSettingTab(new SwitchNextWeekSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private buildConfig() {
		const s = this.settings;
		const dir = s.weeksDir || ".";
		const prefix = dir === "." ? "" : dir + "/";
		return new ConfigManager({
			weeksDir: dir,
			templateFile: prefix + s.templateFile,
			backlogFile: prefix + s.backlogFile,
			weekEndDay: s.weekEndDay,
			weekEndHour: s.weekEndHour,
			reportAutoGenerate: false, // reports.js uses fs.readFileSync — incompatible with browser
			habitsEnabled: false,      // deferred to Phase 2
		});
	}

	private async runProtocol() {
		const validationError = validateSettings(this.settings);
		if (validationError) {
			new Notice(`Switch Next Week: ${validationError}`);
			return;
		}
		if (this.running) {
			new Notice("Switch Next Week: already running");
			return;
		}
		this.running = true;
		const statusBar = this.addStatusBarItem();
		statusBar.setText("Switch Next Week: running…");

		try {
			const config = this.buildConfig();
			const fileSystem = new ObsidianVaultFileSystem(this.app);
			const weekManager = new WeekManager(fileSystem, config);

			const result = await weekManager.executeWeekProtocol(new Date());

			statusBar.remove();
			this.running = false;

			const onOpenFile = this.settings.openFileAfterRun
				? () => this.openCurrentWeekFile(config)
				: null;

			new WeekProtocolModal(this.app, result, onOpenFile).open();
		} catch (e: unknown) {
			statusBar.remove();
			this.running = false;
			const msg = e instanceof Error ? e.message : String(e);
			new Notice(`Switch Next Week failed: ${msg}`);
			console.error("Switch Next Week error:", e);
		}
	}

	private async openCurrentWeekFile(config: InstanceType<typeof ConfigManager>) {
		try {
			const now = new Date();
			const weekNum = dateUtils.getISOWeekNumber(now);
			const fileSystem = new ObsidianVaultFileSystem(this.app);
			const weekManager = new WeekManager(fileSystem, config);
			const found = await weekManager.findCurrentWeekFile(weekNum);
			if (!found) {
				new Notice("Switch Next Week: no current week file found");
				return;
			}
			const filePath = found.path as string;
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				new Notice(`Switch Next Week: could not find file at ${filePath}`);
				return;
			}
			let leaf: WorkspaceLeaf | null = this.app.workspace.getMostRecentLeaf();
			if (!leaf) {
				leaf = this.app.workspace.getLeaf(true);
			}
			await leaf.openFile(file);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			new Notice(`Switch Next Week: could not open file — ${msg}`);
		}
	}
}
