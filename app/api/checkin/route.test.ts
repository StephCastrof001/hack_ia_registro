import { describe, expect, test, vi } from "vitest";
import { createServerSupabase } from "@/lib/supabase/server";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
	createServerSupabase: vi.fn(),
}));

function mockSupabase(
	guestData: Record<string, unknown> | null,
	fetchError: Error | { message: string } | null = null,
	updateError: Error | { message: string } | null = null,
) {
	const mockSb = {
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					eq: vi.fn(() => ({
						single: vi.fn().mockResolvedValue({
							data: guestData,
							error: fetchError,
						}),
					})),
				})),
			})),
			update: vi.fn(() => ({
				eq: vi.fn(() => ({
					eq: vi.fn().mockResolvedValue({ error: updateError }),
				})),
			})),
		})),
	};
	// biome-ignore lint/suspicious/noExplicitAny: mock
	(createServerSupabase as any).mockResolvedValue(mockSb);
}

describe("POST /api/checkin", () => {
	const eventId = "d390a786-8f2e-4b68-b4b3-5793e53c483a";

	test("should_return_400_when_eventId_missing", async () => {
		const req = new Request("http://localhost/api/checkin", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ qrToken: "abc" }),
		});
		const res = await POST(req);
		expect(res.status).toBe(400);
	});

	test("should_return_404_when_token_not_found", async () => {
		mockSupabase(null, new Error("Not found"));
		const req = new Request("http://localhost/api/checkin", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ qrToken: "abc", eventId }),
		});
		const res = await POST(req);
		expect(res.status).toBe(404);
	});

	test("should_return_409_when_guest_already_checked_in", async () => {
		mockSupabase({ id: "123", name: "John", status: "checked_in" });
		const req = new Request("http://localhost/api/checkin", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ qrToken: "abc", eventId }),
		});
		const res = await POST(req);
		expect(res.status).toBe(409);
	});

	test("should_return_200_and_set_checked_in_when_valid", async () => {
		mockSupabase({ id: "123", name: "John", status: "badge_ready" });
		const req = new Request("http://localhost/api/checkin", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ qrToken: "abc", eventId }),
		});
		const res = await POST(req);
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.ok).toBe(true);
		expect(json.guest.status).toBe("checked_in");
	});

	test("should_filter_by_event_id", async () => {
		const mockEqEventId = vi.fn().mockReturnValue({
			single: vi
				.fn()
				.mockResolvedValue({ data: null, error: new Error("Not found") }),
		});
		const mockEqQrToken = vi.fn().mockReturnValue({
			eq: mockEqEventId,
		});

		const mockSb = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: mockEqQrToken,
				})),
			})),
		};
		// biome-ignore lint/suspicious/noExplicitAny: mock
		(createServerSupabase as any).mockResolvedValue(mockSb);

		const req = new Request("http://localhost/api/checkin", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ qrToken: "abc", eventId }),
		});
		const res = await POST(req);
		expect(res.status).toBe(404);

		expect(mockEqEventId).toHaveBeenCalledWith("event_id", eventId);
	});
});
