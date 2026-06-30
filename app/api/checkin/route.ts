import { NextResponse } from "next/server";
import { z } from "zod";
import { decideCheckin } from "@/lib/checkin";
import type { GuestStatus } from "@/lib/guest-status";
import { createAdminSupabase } from "@/lib/supabase/server";

// Exigimos eventId para cumplir la regla C1
const bodySchema = z.object({
	qrToken: z.string().min(1),
	eventId: z.string().uuid(),
});

export async function POST(req: Request) {
	try {
		const json = await req.json().catch(() => null);
		const parsed = bodySchema.safeParse(json);

		if (!parsed.success) {
			return NextResponse.json(
				{ ok: false, error: "bad_request" },
				{ status: 400 },
			);
		}

		const { qrToken, eventId } = parsed.data;
		const sb = createAdminSupabase();

		// C1: Filtrar siempre por event_id
		const { data: guest, error: fetchError } = await sb
			.from("guests")
			.select("id, name, status")
			.eq("qr_token", qrToken)
			.eq("event_id", eventId)
			.single();

		if (fetchError || !guest) {
			return NextResponse.json(
				{ ok: false, reason: "invalid_token" },
				{ status: 404 },
			);
		}

		// Lógica pura (no acoplada a DB)
		const decision = decideCheckin(guest.status as GuestStatus);

		if (!decision.ok) {
			const status = decision.error === "already" ? 409 : 403;
			return NextResponse.json(
				{
					ok: false,
					reason:
						decision.error === "already"
							? "already_checked_in"
							: decision.error,
				},
				{ status },
			);
		}

		// Transición de estado permitida, actualizamos en DB
		const { error: updateError } = await sb
			.from("guests")
			.update({ status: decision.next })
			.eq("id", guest.id)
			.eq("event_id", eventId);

		if (updateError) {
			throw updateError;
		}

		return NextResponse.json(
			{ ok: true, guest: { name: guest.name, status: decision.next } },
			{ status: 200 },
		);
	} catch {
		return NextResponse.json(
			{ ok: false, error: "server_error" },
			{ status: 500 },
		);
	}
}
