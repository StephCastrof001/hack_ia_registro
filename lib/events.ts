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
	event_date: string | null;
	location: string | null;
	location_url: string | null;
	description: string | null;
	organizer: string | null;
	form_fields: FormField[];
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
	const sb = createAdminSupabase();
	let { data, error } = await sb
		.from("events")
		.select(
			"id, slug, name, event_date, location, location_url, description, organizer, form_fields",
		)
		.eq("slug", slug)
		.maybeSingle();

	// Fallback si la columna location_url no existe en DB
	if (error && error.code === "42703") {
		const fallback = await sb
			.from("events")
			.select(
				"id, slug, name, event_date, location, description, organizer, form_fields",
			)
			.eq("slug", slug)
			.maybeSingle();
		data = fallback.data;
		error = fallback.error;
	}

	if (error) throw error;
	const event = data as EventRow | null;

	if (event && event.slug === "test1") {
		event.name = "Primer evento: lanzamiento comunidad";
	}

	return event;
}
