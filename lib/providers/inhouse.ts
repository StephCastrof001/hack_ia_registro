import { transition } from "@/lib/guest-status";
import { createAdminSupabase } from "@/lib/supabase/server";
import { newToken } from "@/lib/tokens";
import type { Guest, RegisterInput, RegistroProvider } from "./types";

/**
 * InhouseProvider — registro vivo (P1). Guarda/lee guests en Supabase.
 * Toda query filtra por event_id (C1). Tokens con CSPRNG (ADR-002).
 */
export const InhouseProvider: RegistroProvider = {
	async register(eventId, input: RegisterInput): Promise<Guest> {
		const sb = createAdminSupabase();
		const { data, error } = await sb
			.from("guests")
			.insert({
				event_id: eventId,
				name: input.name,
				last_name: input.last_name ?? null,
				email: input.email,
				role: input.role ?? null,
				company: input.company ?? null,
				phone: input.phone ?? null,
				dni: input.dni ?? null,
				ruc: input.ruc ?? null,
				status: "registered",
				magic_token: newToken(),
				qr_token: newToken(),
			})
			.select()
			.single();
		if (error) throw error;
		return data as Guest;
	},

	async getGuests(eventId): Promise<Guest[]> {
		const sb = createAdminSupabase();
		const { data, error } = await sb
			.from("guests")
			.select("*")
			.eq("event_id", eventId) // C1: nunca global
			.order("created_at", { ascending: true });
		if (error) throw error;
		return (data ?? []) as Guest[];
	},

	async approve(guestId): Promise<Guest> {
		const sb = createAdminSupabase();
		const { data: current, error: e1 } = await sb
			.from("guests")
			.select("status")
			.eq("id", guestId)
			.single();
		if (e1) throw e1;
		const next = transition(current.status, "approved"); // valida la transición
		const { data, error } = await sb
			.from("guests")
			.update({ status: next, approved_at: new Date().toISOString() })
			.eq("id", guestId)
			.select()
			.single();
		if (error) throw error;
		return data as Guest;
	},
};
