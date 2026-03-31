/**
 * Type stubs for switch-next-week CommonJS library.
 * The actual implementations are in ../switch-next-week/lib/
 */

declare module "switch-next-week/lib" {
	export class ConfigManager {
		constructor(options?: {
			weeksDir?: string;
			templateFile?: string;
			backlogFile?: string;
			weekEndDay?: number;
			weekEndHour?: number;
			reportAutoGenerate?: boolean;
			habitsEnabled?: boolean;
			[key: string]: unknown;
		});

		static fromEnv(): ConfigManager;
		getWeeksDir(): string;
		getBacklogPath(): string;
		getTemplatePath(): string;
	}

	export class WeekManager {
		constructor(
			fileSystem: IFileSystem,
			config: ConfigManager,
			options?: { reportGenerator?: ((filePath: string) => Promise<unknown>) | null }
		);

		executeWeekProtocol(now: Date): Promise<WeekProtocolResult>;
		findCurrentWeekFile(weekNum: number): Promise<string | null>;
	}

	export interface IFileSystem {
		readFile(filePath: string): Promise<string>;
		writeFile(filePath: string, content: string): Promise<void>;
		deleteFile(filePath: string): Promise<void>;
		listFiles(dirPath: string): Promise<string[]>;
		exists(filePath: string): Promise<boolean>;
	}

	export interface WeekProtocolResult {
		success: boolean;
		messages: string[];
		filesChanged: string[];
		currentWeekFile?: string | null;
		error?: string;
	}

	export const dateUtils: {
		getISOWeekNumber(date: Date): number;
		formatDate(date: Date): string;
		getWeekDateRangeISO(year: number, weekNum: number): { start: string; end: string };
		isBeforeWeekEndTime(
			now: Date,
			weekEndDay: number,
			weekEndHour: number
		): boolean;
	};
}
