/**
 * LumaProvider — seed/plan B (ADR-002). Lee el CSV export de Luma free y lo
 * mapea a guests. Solo procesa approval_status === "approved".
 * El qr_url de Luma se conserva (rama A); el qr_token propio se genera en el upsert (rama B).
 */

export interface ParsedGuest {
	external_id: string; // guest_id de Luma
	name: string;
	last_name: string;
	email: string;
	phone: string;
	role: string;
	company: string;
	dni: string;
	ruc: string;
	qr_url: string;
}

/** Parsea una línea CSV respetando campos entre comillas dobles. */
function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	let cur = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (line[i + 1] === '"') {
					cur += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				cur += ch;
			}
		} else if (ch === '"') {
			inQuotes = true;
		} else if (ch === ",") {
			out.push(cur);
			cur = "";
		} else {
			cur += ch;
		}
	}
	out.push(cur);
	return out;
}

const COL = {
	guest_id: "guest_id",
	name: "name",
	first_name: "first_name",
	last_name: "last_name",
	email: "email",
	phone: "phone_number",
	approval: "approval_status",
	qr_url: "qr_code_url",
	company: "¿Para qué empresa trabajas?",
	role: "¿Cuál es tu cargo?",
	dni: "Nro. de DNI",
	ruc: "Ruc de la empresa",
} as const;

/**
 * Seed: parsea el CSV de Luma y hace upsert de los approved en guests.
 * Genera magic_token + qr_token propios (rama B) y conserva qr_url de Luma (rama A).
 * Dedupe por (event_id, email): reimportar NO duplica. Devuelve nº insertados.
 */
export async function seedLumaGuests(
	eventId: string,
	csv: string,
): Promise<number> {
	const { createAdminSupabase } = await import("@/lib/supabase/server");
	const { newToken } = await import("@/lib/tokens");
	const parsed = parseLumaCsv(csv);
	if (parsed.length === 0) return 0;

	const rows = parsed.map((g) => ({
		event_id: eventId,
		name: g.name,
		last_name: g.last_name || null,
		email: g.email,
		role: g.role || null,
		company: g.company || null,
		phone: g.phone || null,
		dni: g.dni || null,
		ruc: g.ruc || null,
		qr_url: g.qr_url || null,
		external_id: g.external_id || null,
		status: "approved" as const, // Luma ya los aprobó
		approved_at: new Date().toISOString(),
		magic_token: newToken(),
		qr_token: newToken(),
	}));

	const sb = createAdminSupabase();
	const { data, error } = await sb
		.from("guests")
		.upsert(rows, { onConflict: "event_id,email", ignoreDuplicates: true })
		.select("id");
	if (error) throw error;
	return data?.length ?? 0;
}

/** Mapea el CSV de Luma a ParsedGuest[], filtrando solo approved. */
export function parseLumaCsv(csv: string): ParsedGuest[] {
	const lines = csv
		.replace(/^﻿/, "")
		.split(/\r?\n/)
		.filter((l) => l.trim() !== "");
	if (lines.length < 2) return [];

	const headers = parseCsvLine(lines[0]);
	const idx = (key: string) => headers.indexOf(key);

	return lines
		.slice(1)
		.map((line) => parseCsvLine(line))
		.filter((cells) => cells[idx(COL.approval)] === "approved")
		.map((cells) => {
			const at = (key: string) =>
				idx(key) >= 0 ? (cells[idx(key)] ?? "").trim() : "";
			return {
				external_id: at(COL.guest_id),
				name: at(COL.first_name) || at(COL.name),
				last_name: at(COL.last_name),
				email: at(COL.email),
				phone: at(COL.phone),
				role: at(COL.role),
				company: at(COL.company),
				dni: at(COL.dni),
				ruc: at(COL.ruc),
				qr_url: at(COL.qr_url),
			};
		});
}
