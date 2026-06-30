import { createAdminSupabase } from "@/lib/supabase/server";

/** Campo configurable del formulario por evento (P2). */
export interface FormField {
	key: string;
	label: string;
	type: "text" | "email" | "tel" | "number";
	required: boolean;
}

/** Evento (datos públicos). */
export interface EventRow {
	id: string;
	slug: string;
	name: string;
	event_date?: string | null;
	end_date?: string | null;
	location_type?: string | null;
	location?: string | null;
	location_url?: string | null;
	instructions?: string | null;
	description?: string | null;
	organizer?: string | null;
	form_fields: FormField[];
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
	const sb = createAdminSupabase();
	let { data, error } = await sb
		.from("events")
		.select(
			"id, slug, name, event_date, end_date, location_type, location, location_url, instructions, description, organizer, form_fields",
		)
		.eq("slug", slug)
		.maybeSingle();

	// Fallback si las nuevas columnas no existen en DB
	if (error && error.code === "42703") {
		const fallback = await sb
			.from("events")
			.select(
				"id, slug, name, event_date, location, location_url, description, organizer, form_fields",
			)
			.eq("slug", slug)
			.maybeSingle();

		if (fallback.error && fallback.error.code === "42703") {
			// Segundo fallback (si tampoco existe location_url)
			const fallback2 = await sb
				.from("events")
				.select(
					"id, slug, name, event_date, location, description, organizer, form_fields",
				)
				.eq("slug", slug)
				.maybeSingle();
			data = fallback2.data as typeof data;
			error = fallback2.error;
		} else {
			data = fallback.data as typeof data;
			error = fallback.error;
		}
	}

	if (error) throw error;
	const event = data as EventRow | null;

	if (event && event.slug === "test1") {
		// DEUDA TÉCNICA (manual, demo): las columnas end_date/location_type/location_url
		// no existen en DB todavía (refine = supabase/migrations/0002_event_location_fields.sql).
		// Inyectadas acá para el evento de demo. Al migrar + cargar desde el form, borrar esto.
		event.end_date = "2026-07-22T13:00:00-05:00";
		event.location_type = "Presencial";
		event.location_url =
			"https://www.google.com/maps/search/?api=1&query=-12.096595299999999%2C-77.02745329999999&query_place_id=ChIJ5dJvgmjIBZERrVP4iV92cvY";
	}

	return event;
}
