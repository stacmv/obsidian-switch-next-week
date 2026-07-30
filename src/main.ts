import { Notice, Plugin, TFile, WorkspaceLeaf, normalizePath } from "obsidian";
import { SwitchNextWeekSettings, DEFAULT_SETTINGS, SwitchNextWeekSettingTab, validateSettings } from "./settings";
import { WeekProtocolModal } from "./modal";
import { ObsidianVaultFileSystem } from "./vault-fs";
import { SPHERES_SCAFFOLD } from "./spheres-scaffold";

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

		this.addCommand({
			id: "create-spheres-scaffold",
			name: "Create sub-sphere model file",
			callback: () => this.createSpheresScaffold(),
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
		const td = s.templatesDir || ".";
		const wPrefix = dir === "." ? "" : dir + "/";
		const tPrefix = td === "." ? "" : td + "/";
		return new ConfigManager({
			weeksDir: dir,
			templateFile:  tPrefix + "template.md",
			backlogFile:   wPrefix + s.backlogFile,
			monthlyFile:   tPrefix + "monthly.md",
			weeklyFile:    tPrefix + "weekly.md",
			calendarFile:  tPrefix + "calendar.md",
			yearlyFile:    tPrefix + "yearly.md",
			// Full vault path, used as-is (the library never joins it with weeksDir).
			// undefined when empty so the sub-sphere feature stays off — the library
			// has NO default filename for this option, and an empty prefix must not
			// resolve to a truthy path that would silently enable it.
			spheresFile: s.spheresFile ? s.spheresFile : undefined,
			weekEndDay: s.weekEndDay,
			weekEndHour: s.weekEndHour,
			reportAutoGenerate: false, // reports.js uses fs.readFileSync — incompatible with browser
			habitsEnabled: false,      // deferred to Phase 2
		});
	}

	/** Write a starter sub-sphere model file at the configured path, if it doesn't exist yet. */
	private async createSpheresScaffold() {
		const path = this.settings.spheresFile.trim();
		if (!path) {
			new Notice("Switch Next Week: set the sub-sphere model file path in settings first.");
			return;
		}
		try {
			const fileSystem = new ObsidianVaultFileSystem(this.app);
			if (await fileSystem.exists(path)) {
				new Notice(`Switch Next Week: sub-sphere model file already exists — ${path}`);
				await this.openVaultFile(path);
				return;
			}
			await fileSystem.writeFile(path, SPHERES_SCAFFOLD);
			new Notice(`Switch Next Week: created sub-sphere model file — ${path}`);
			await this.openVaultFile(path);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			new Notice(`Switch Next Week: could not create model file — ${msg}`);
		}
	}

	/** Open a vault file by its vault-relative path in the most recent leaf. */
	private async openVaultFile(filePath: string) {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(filePath));
		if (!(file instanceof TFile)) return;
		let leaf: WorkspaceLeaf | null = this.app.workspace.getMostRecentLeaf();
		if (!leaf) leaf = this.app.workspace.getLeaf(true);
		await leaf.openFile(file);
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

			// Sub-sphere feature is opt-in: if a path is set but the file is missing,
			// nudge the user toward the scaffold command. Non-blocking — the run
			// proceeds with sub-sphere routing simply inactive this time.
			const spheresPath = this.settings.spheresFile.trim();
			if (spheresPath && !(await fileSystem.exists(spheresPath))) {
				new Notice(
					`Switch Next Week: sub-sphere model file not found (${spheresPath}). ` +
					"Run \"Create sub-sphere model file\" to generate a starter."
				);
			}

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
