import type { GuestStatus } from "@/lib/guest-status";

export type CheckinResult =
	| { ok: true; next: "checked_in" }
	| { ok: false; error: "invalid" | "already" | "not_approved" };

export function decideCheckin(current: GuestStatus | null): CheckinResult {
	if (current === null) {
		return { ok: false, error: "invalid" };
	}
	if (current === "checked_in") {
		return { ok: false, error: "already" };
	}
	if (current === "badge_ready") {
		return { ok: true, next: "checked_in" };
	}
	return { ok: false, error: "not_approved" };
}
