import type { GuestStatus } from "@/lib/guest-status";
import { createAdminSupabase } from "@/lib/supabase/server";

/** Datos del invitado expuestos en la página self-service (NO tokens ajenos). */
export interface MagicGuest {
	id: string;
	event_id: string;
	name: string;
	last_name: string | null;
	status: GuestStatus;
	photo_url: string | null;
}

/** Lee un invitado por su magic_token (server). Null si no existe. */
export async function getGuestByMagicToken(
	token: string,
): Promise<MagicGuest | null> {
	const sb = createAdminSupabase();
	const { data, error } = await sb
		.from("guests")
		.select("id, event_id, name, last_name, status, photo_url")
		.eq("magic_token", token)
		.maybeSingle();
	if (error) throw error;
	return (data as MagicGuest | null) ?? null;
}
