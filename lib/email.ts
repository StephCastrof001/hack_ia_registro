import { Resend } from "resend";
import { getEnv } from "@/lib/env";
import { buildApprovalEmail, buildPendingEmail } from "./email-template";

/**
 * Envía el email de aprobación con el magic link.
 * Lazy init: el cliente Resend se crea al llamar, NO al importar el módulo
 * (si se instancia arriba, `next build` revienta cuando RESEND_API_KEY no está).
 * Remitente desde env EMAIL_FROM (dominio verificado en Resend, p.ej. HACK IA <hola@hackia.klipso.lat>).
 */
export async function sendApprovalEmail(
	email: string,
	name: string,
	magicUrl: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	try {
		const env = getEnv();
		const resend = new Resend(env.RESEND_API_KEY);
		const { subject, html } = buildApprovalEmail({ name, magicUrl });

		const { data, error } = await resend.emails.send({
			from: env.EMAIL_FROM,
			to: [email],
			replyTo: "steph@klipso.lat",
			subject,
			html,
		});

		if (error) {
			return { ok: false, error: error.message };
		}

		return { ok: true, id: data?.id };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

export async function sendPendingEmail(
	email: string,
	name: string,
	eventName: string,
	eventDate?: string | null,
	eventLocation?: string | null,
	locationUrl?: string | null,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	try {
		const env = getEnv();
		const resend = new Resend(env.RESEND_API_KEY);
		const { subject, html } = buildPendingEmail(
			name,
			eventName,
			eventDate,
			eventLocation,
			locationUrl,
		);

		const { data, error } = await resend.emails.send({
			from: env.EMAIL_FROM,
			to: [email],
			replyTo: "steph@klipso.lat",
			subject,
			html,
		});

		if (error) {
			return { ok: false, error: error.message };
		}
		return { ok: true, id: data?.id };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}
