import { App, Modal } from "obsidian";

export interface WeekProtocolResult {
	success: boolean;
	messages: string[];
	filesChanged: string[];
	currentWeekFile?: string | null;
	error?: string;
}

export class WeekProtocolModal extends Modal {
	private result: WeekProtocolResult;
	private onOpenFile: (() => void) | null;

	constructor(app: App, result: WeekProtocolResult, onOpenFile: (() => void) | null) {
		super(app);
		this.result = result;
		this.onOpenFile = onOpenFile;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: "Switch Next Week" });

		// Status line
		const statusEl = contentEl.createEl("p");
		if (this.result.success) {
			statusEl.setText("✓ Готово");
			statusEl.style.color = "var(--color-green)";
		} else {
			statusEl.setText("✗ Ошибка");
			statusEl.style.color = "var(--color-red)";
		}

		// Messages block
		if (this.result.messages.length > 0) {
			const pre = contentEl.createEl("pre");
			pre.setText(this.result.messages.join("\n"));
			pre.style.whiteSpace = "pre-wrap";
			pre.style.fontSize = "var(--font-smaller)";
			pre.style.maxHeight = "300px";
			pre.style.overflowY = "auto";
			pre.style.padding = "8px";
			pre.style.borderRadius = "4px";
			pre.style.background = "var(--background-secondary)";
		}

		// Error detail
		if (!this.result.success && this.result.error) {
			const errEl = contentEl.createEl("p");
			errEl.setText(this.result.error);
			errEl.style.color = "var(--color-red)";
			errEl.style.fontSize = "var(--font-smaller)";
		}

		// Buttons
		const btnContainer = contentEl.createDiv({ cls: "modal-button-container" });
		btnContainer.style.display = "flex";
		btnContainer.style.justifyContent = "flex-end";
		btnContainer.style.gap = "8px";
		btnContainer.style.marginTop = "12px";

		if (this.result.success && this.onOpenFile) {
			const openBtn = btnContainer.createEl("button", {
				text: "Открыть файл недели",
				cls: "mod-cta",
			});
			openBtn.addEventListener("click", () => {
				this.close();
				this.onOpenFile?.();
			});
		}

		const closeBtn = btnContainer.createEl("button", { text: "Закрыть" });
		closeBtn.addEventListener("click", () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
