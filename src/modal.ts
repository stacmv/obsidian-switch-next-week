import { App, Modal } from "obsidian";

export interface WeekProtocolResult {
	success: boolean;
	messages: string[];
	filesChanged: string[];
	currentWeekFile?: string | null;
	error?: string;
}

const YEAR_TRANSITION_MARKER = "YEAR TRANSITION REQUIRED";

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
		contentEl.addClass("snw-modal");

		contentEl.createEl("h2", { text: "Switch Next Week" });

		const fullText = this.result.messages.join("\n");
		const isYearMismatch = fullText.includes(YEAR_TRANSITION_MARKER);

		if (isYearMismatch) {
			this._renderYearMismatch(contentEl, fullText);
		} else {
			this._renderNormal(contentEl);
		}

		// Buttons
		const btnContainer = contentEl.createDiv({ cls: "snw-modal-buttons" });

		const copyBtn = btnContainer.createEl("button", { text: "Копировать" });
		copyBtn.addEventListener("click", () => {
			navigator.clipboard.writeText(this.result.messages.join("\n")).then(() => {
				copyBtn.setText("Скопировано ✓");
				setTimeout(() => copyBtn.setText("Копировать"), 1500);
			});
		});

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

	private _renderNormal(contentEl: HTMLElement): void {
		// Status line
		const statusEl = contentEl.createEl("p", { cls: "snw-status" });
		if (this.result.success) {
			statusEl.setText("✓ Готово");
			statusEl.addClass("snw-status-ok");
		} else {
			statusEl.setText("✗ Ошибка");
			statusEl.addClass("snw-status-error");
		}

		// Messages
		if (this.result.messages.length > 0) {
			const pre = contentEl.createEl("pre", { cls: "snw-messages" });
			pre.setText(this.result.messages.join("\n"));
		}
	}

	private _renderYearMismatch(contentEl: HTMLElement, fullText: string): void {
		// Warning banner
		const banner = contentEl.createDiv({ cls: "snw-year-banner" });
		banner.createEl("strong", { text: "⚠ Требуется переход нового года" });

		// Extract the year numbers from the message
		const yearMatch = fullText.match(/from (\d{4}), but current year is (\d{4})/);
		if (yearMatch) {
			banner.createEl("p", {
				text: `Найдены файлы из ${yearMatch[1]}, текущий год ${yearMatch[2]}.`,
			});
		}

		banner.createEl("p", {
			text: "Приложение работает с одним годом за раз. Архивируйте файлы предыдущего года.",
		});

		// Show instructions in a scrollable pre block
		const pre = contentEl.createEl("pre", { cls: "snw-messages" });
		// Extract just the INSTRUCTIONS section from the full text
		const instructionsMatch = fullText.match(/INSTRUCTIONS:([\s\S]+)/);
		if (instructionsMatch) {
			pre.setText("INSTRUCTIONS:" + instructionsMatch[1].trimEnd());
		} else {
			pre.setText(fullText);
		}
	}
}
