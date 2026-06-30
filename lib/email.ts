import { Resend } from "resend";
import { buildApprovalEmail } from "./email-template";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(
	email: string,
	name: string,
	magicUrl: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	try {
		const { subject, html } = buildApprovalEmail({ name, magicUrl });

		const { data, error } = await resend.emails.send({
			from: "HACK IA <onboarding@resend.dev>",
			to: [email],
			subject: subject,
			html: html,
		});

		if (error) {
			return { ok: false, error: error.message };
		}

		return { ok: true, id: data?.id };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}
