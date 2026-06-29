import { describe, expect, it } from "vitest";
import { decideCheckin } from "./checkin";
import type { GuestStatus } from "./guest-status";

describe("decideCheckin", () => {
	it("returns invalid for null", () => {
		expect(decideCheckin(null)).toEqual({ ok: false, error: "invalid" });
	});

	it("returns already for checked_in", () => {
		expect(decideCheckin("checked_in")).toEqual({
			ok: false,
			error: "already",
		});
	});

	it("returns ok for badge_ready", () => {
		expect(decideCheckin("badge_ready")).toEqual({
			ok: true,
			next: "checked_in",
		});
	});

	it("returns not_approved for other states", () => {
		const otherStates: GuestStatus[] = [
			"registered",
			"approved",
			"rejected",
			"canceled",
		];
		for (const state of otherStates) {
			expect(decideCheckin(state)).toEqual({
				ok: false,
				error: "not_approved",
			});
		}
	});
});
