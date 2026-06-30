import { type GuestStatus, transition } from "@/lib/guest-status";
import { createAdminSupabase } from "@/lib/supabase/server";

const BUCKET = "photos";
const EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

/** Sube la foto del invitado al bucket y devuelve su URL pública. Path por evento (C1). */
export async function uploadGuestPhoto(
	eventId: string,
	guestId: string,
	file: { bytes: ArrayBuffer; type: string },
): Promise<string> {
	const sb = createAdminSupabase();
	const ext = EXT[file.type] ?? "jpg";
	const path = `${eventId}/${guestId}.${ext}`;
	const { error } = await sb.storage
		.from(BUCKET)
		.upload(path, file.bytes, { contentType: file.type, upsert: true });
	if (error) throw error;
	const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
	return data.publicUrl;
}

/**
 * Persiste la foto: setea photo_url + consent (ADR-001) y avanza approved→badge_ready (D2).
 * La foto es el gate: sin foto no hay badge.
 */
export async function setGuestPhoto(
	guestId: string,
	currentStatus: GuestStatus,
	photoUrl: string,
	consentVersion: string,
): Promise<void> {
	const sb = createAdminSupabase();
	const next = transition(currentStatus, "badge_ready"); // valida approved→badge_ready
	const { error } = await sb
		.from("guests")
		.update({
			photo_url: photoUrl,
			status: next,
			consent_at: new Date().toISOString(),
			consent_version: consentVersion,
		})
		.eq("id", guestId);
	if (error) throw error;
}
