/**
 * Tests for the baked-in sub-sphere model scaffold.
 *
 * The scaffold is written verbatim into a user's vault by the
 * "Create sub-sphere model file" command, so it must be a well-formed,
 * parseable model — otherwise the very file we hand the user would be broken.
 */
import { describe, it, expect } from "vitest";
import { SPHERES_SCAFFOLD } from "../src/spheres-scaffold";
// The library is a CommonJS sibling package; parse the scaffold with the real parser.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SpheresModel } = require("switch-next-week/lib");

describe("SPHERES_SCAFFOLD", () => {
	it("contains the required special sections", () => {
		expect(SPHERES_SCAFFOLD).toContain("## Секции недели");
		expect(SPHERES_SCAFFOLD).toContain("## Не назначено");
	});

	it("parses as a valid sub-sphere model", () => {
		const model = SpheresModel.fromContent(SPHERES_SCAFFOLD);
		expect(model.valid).toBe(true);
	});

	it("is a starter skeleton — sub-spheres defined but no projects mapped yet", () => {
		const model = SpheresModel.fromContent(SPHERES_SCAFFOLD);
		// No project bullets in the scaffold, so nothing resolves to a chain.
		expect(model.resolve("switch-next-week")).toBeNull();
		expect(model.isKnown("switch-next-week")).toBe(false);
	});
});
