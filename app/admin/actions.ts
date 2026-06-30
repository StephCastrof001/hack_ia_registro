"use server";

import { revalidatePath } from "next/cache";
import { sendApprovalEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { type GuestStatus, transition } from "@/lib/guest-status";
import {
	createAdminSupabase,
	createServerSupabase,
} from "@/lib/supabase/server";
import { buildMagicUrl } from "@/lib/urls";

/**
 * Exige admin AUTORIZADO (no solo autenticado): sesión válida + email en la allowlist.
 * Supabase permite signups públicos por default, así que "logueado" ≠ "admin".
 * Las mutaciones usan service_role (bypassa RLS) → el gate de autorización vive acá.
 */
async function requireAdmin(): Promise<void> {
	const auth = await createServerSupabase();
	const {
		data: { user },
	} = await auth.auth.getUser();
	if (!user?.email) throw new Error("No autorizado");

	const allowed = getEnv()
		.ADMIN_EMAILS.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	if (!allowed.includes(user.email.toLowerCase())) {
		throw new Error("No autorizado");
	}
}

export async function approveGuest(
	guestId: string,
	eventId: string,
): Promise<void> {
	await requireAdmin();
	const sb = createAdminSupabase();

	const { data: current, error: fetchError } = await sb
		.from("guests")
		.select("status, email, name, magic_token")
		.eq("id", guestId)
		.eq("event_id", eventId)
		.single();

	if (fetchError || !current) {
		throw new Error("Guest no encontrado o error de DB");
	}

	const nextStatus = transition(current.status as GuestStatus, "approved");

	const { error: updateError } = await sb
		.from("guests")
		.update({ status: nextStatus, approved_at: new Date().toISOString() })
		.eq("id", guestId)
		.eq("event_id", eventId);

	if (updateError) {
		throw new Error("Error actualizando status");
	}

	const env = getEnv();
	const magicUrl = buildMagicUrl(env.NEXT_PUBLIC_APP_URL, current.magic_token);

	const emailResult = await sendApprovalEmail(
		current.email,
		current.name,
		magicUrl,
	);
	if (emailResult.ok) {
		console.log(`email enviado id=${emailResult.id}`);
	} else {
		console.error("Error enviando email:", emailResult.error);
	}

	revalidatePath("/admin");
}

export async function rejectGuest(
	guestId: string,
	eventId: string,
): Promise<void> {
	await requireAdmin();
	const sb = createAdminSupabase();

	const { data: current, error: fetchError } = await sb
		.from("guests")
		.select("status")
		.eq("id", guestId)
		.eq("event_id", eventId)
		.single();

	if (fetchError || !current) {
		throw new Error("Guest no encontrado o error de DB");
	}

	const nextStatus = transition(current.status as GuestStatus, "rejected");

	const { error: updateError } = await sb
		.from("guests")
		.update({ status: nextStatus })
		.eq("id", guestId)
		.eq("event_id", eventId);

	if (updateError) {
		throw new Error("Error actualizando status");
	}

	revalidatePath("/admin");
}
