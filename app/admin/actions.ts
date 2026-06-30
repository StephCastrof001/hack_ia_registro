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
	// email_confirmed_at: evita spoofing de email no verificado contra la allowlist.
	if (!user?.email || !user.email_confirmed_at)
		throw new Error("No autorizado");

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

export async function createEvent(formData: FormData): Promise<void> {
	await requireAdmin();
	const sb = createAdminSupabase();

	const name = formData.get("name") as string;
	const slug = formData.get("slug") as string;
	const event_date = formData.get("event_date") as string;
	const end_date = formData.get("end_date") as string;
	const organizer = formData.get("organizer") as string;
	const location_type = formData.get("location_type") as string;
	const location = formData.get("location") as string;
	const location_url = formData.get("location_url") as string;
	const description = formData.get("description") as string;
	const instructions = formData.get("instructions") as string;

	if (!name || !slug) {
		throw new Error("Nombre y Slug son requeridos");
	}

	// Default form fields para el MVP
	const defaultFormFields = [
		{ key: "name", label: "Nombres", type: "text", required: true },
		{ key: "lastName", label: "Apellidos", type: "text", required: true },
		{ key: "email", label: "Correo Electrónico", type: "email", required: true },
		{ key: "phone", label: "Celular", type: "tel", required: false },
		{ key: "company", label: "Empresa", type: "text", required: false },
		{ key: "role", label: "Rol / Cargo", type: "text", required: false },
		{ key: "dni", label: "DNI", type: "text", required: false },
	];

	const eventData = {
		name,
		slug,
		event_date: event_date ? new Date(event_date).toISOString() : null,
		end_date: end_date ? new Date(end_date).toISOString() : null,
		organizer: organizer || null,
		location_type: location_type || "Presencial",
		location: location || null,
		location_url: location_url || null,
		description: description || null,
		instructions: instructions || null,
		form_fields: defaultFormFields,
	};

	// Intentamos insertar con todos los campos
	const { error } = await sb.from("events").insert(eventData);

	if (error) {
		// Fallback: si las columnas nuevas no existen, reintentamos sin ellas
		if (error.code === "42703") {
			const { error: fallbackError } = await sb.from("events").insert({
				name: eventData.name,
				slug: eventData.slug,
				event_date: eventData.event_date,
				organizer: eventData.organizer,
				location: eventData.location,
				description: eventData.description,
				form_fields: eventData.form_fields,
			});
			if (fallbackError) throw new Error(fallbackError.message);
		} else {
			throw new Error(error.message);
		}
	}

	revalidatePath("/admin");
}
