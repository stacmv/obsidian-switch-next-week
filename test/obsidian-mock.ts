/**
 * Minimal Obsidian API mock for Vitest — provides just enough for vault-fs tests.
 * The real Obsidian types are provided by the `obsidian` npm package (dev dep).
 */

export function normalizePath(path: string): string {
	// Match Obsidian's normalizePath: forward slashes, no trailing slash
	return path.replace(/\\/g, "/").replace(/\/+$/, "") || ".";
}

export class TFile {
	constructor(public path: string, public name: string) {}
}

export class TFolder {
	children: Array<TFile | TFolder> = [];
	constructor(public path: string, public name: string, children?: Array<TFile | TFolder>) {
		if (children) this.children = children;
	}
}

export class Plugin {}
export class Modal {
	app: unknown;
	contentEl: unknown = document.createElement("div");
	constructor(app: unknown) { this.app = app; }
	open() {}
	close() {}
}
export class PluginSettingTab {
	app: unknown;
	plugin: unknown;
	containerEl: unknown = document.createElement("div");
	constructor(app: unknown, plugin: unknown) { this.app = app; this.plugin = plugin; }
	display() {}
}
export class Setting {
	constructor(_containerEl: unknown) {}
	setName(_name: string) { return this; }
	setDesc(_desc: string) { return this; }
	addText(_cb: unknown) { return this; }
	addToggle(_cb: unknown) { return this; }
	addDropdown(_cb: unknown) { return this; }
}
export class Notice {
	constructor(_msg: string) {}
}
