import { NextResponse } from "next/server";
import { z } from "zod";
import { InhouseProvider } from "@/lib/providers/inhouse";
import { registerSchema } from "@/lib/validation";
import { sendPendingEmail } from "@/lib/email";
import { createAdminSupabase } from "@/lib/supabase/server";

// API interna (P7): la UI (cliente) postea acá, nunca toca Supabase directo.
const bodySchema = registerSchema.extend({ eventId: z.string().uuid() });

export async function POST(req: Request) {
	const json = await req.json().catch(() => null);
	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json(
			{ ok: false, error: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const { eventId, ...input } = parsed.data;
	try {
		const guest = await InhouseProvider.register(eventId, input);
		
		// Enviar email de pendiente (sin bloquear la respuesta 201)
		const sb = createAdminSupabase();
		sb.from("events")
			.select("name, event_date, end_date, location_type, location, location_url, instructions")
			.eq("id", eventId)
			.single()
			.then(({ data, error }) => {
				if (error) {
					// Fallback si las nuevas columnas no existen en DB
					sb.from("events")
						.select("name, event_date, location")
						.eq("id", eventId)
						.single()
						.then(({ data: fallbackData }) => {
							if (fallbackData)
								sendPendingEmail(
									input.email,
									input.name,
									fallbackData.name,
									fallbackData.event_date,
									fallbackData.location,
								);
						});
				} else if (data) {
					sendPendingEmail(
						input.email,
						input.name,
						data.name,
						data.event_date,
						data.location,
						data.location_url,
						data.end_date,
						data.location_type,
						data.instructions,
					);
				}
			});

		// NO devolver tokens al cliente — solo el estado.
		return NextResponse.json(
			{ ok: true, status: guest.status },
			{ status: 201 },
		);
	} catch {
		return NextResponse.json(
			{ ok: false, error: "register_failed" },
			{ status: 500 },
		);
	}
}
