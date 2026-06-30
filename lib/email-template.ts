export interface ApprovalEmailInput {
	name: string;
	magicUrl: string;
}

function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function buildApprovalEmail(input: ApprovalEmailInput): {
	subject: string;
	html: string;
} {
	const safeName = escapeHtml(input.name);

	// valida esquema (solo http/https) y escapa la URL en contexto de atributo
	const parsed = new URL(input.magicUrl);
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		throw new Error("magicUrl: esquema no permitido");
	}
	const safeUrl = escapeHtml(parsed.toString());

	const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>HACK IA</title>
</head>
<body style="background-color: #0c0c14; color: #e8e8f0; font-family: sans-serif; padding: 24px; text-align: center;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a24; padding: 32px; border-radius: 8px;">
    <h1 style="color: #6f5ff2; margin-top: 0;">¡Estás dentro de HACK IA!</h1>
    <p style="font-size: 16px; line-height: 1.5;">Hola <strong>${safeName}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.5;">Tu solicitud ha sido aprobada. Por favor, usa el siguiente enlace para confirmar y obtener tu credencial de acceso.</p>
    <a href="${safeUrl}" style="display: inline-block; background-color: #6f5ff2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 16px;">
      Ver mi credencial
    </a>
  </div>
</body>
</html>
`.trim();

	return {
		subject: "¡Aprobado! Tu entrada para HACK IA",
		html,
	};
}

export function buildPendingEmail(
	name: string,
	eventName: string,
	eventDate?: string | null,
	eventLocation?: string | null,
	locationUrl?: string | null,
	endDate?: string | null,
	locationType?: string | null,
	instructions?: string | null,
): {
	subject: string;
	html: string;
} {
	const safeName = escapeHtml(name);
	const safeEventName = escapeHtml(eventName);

	let detailsHtml = "";
	if (eventDate || eventLocation || instructions) {
		let dateStr = "";
		if (eventDate) {
			const startD = new Date(eventDate);
			dateStr = startD.toLocaleDateString("es-PE", {
				weekday: "long",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
			if (endDate) {
				const endD = new Date(endDate);
				if (startD.toLocaleDateString() === endD.toLocaleDateString()) {
					dateStr += \` - \${endD.toLocaleTimeString("es-PE", {
						hour: "2-digit",
						minute: "2-digit",
					})}\`;
				} else {
					dateStr += \` hasta \${endD.toLocaleDateString("es-PE", {
						weekday: "long",
						month: "long",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					})}\`;
				}
			}
		}

		const locationHtml = eventLocation
			? locationUrl
				? \`<a href="\${escapeHtml(
						locationUrl,
					)}" target="_blank" style="color: #6f5ff2; text-decoration: underline;">📍 <strong>\${escapeHtml(
						eventLocation,
					)}</strong></a>\`
				: \`<p style="margin: 0; font-size: 14px; color: #e8e8f0;">📍 <strong>\${escapeHtml(
						eventLocation,
					)}</strong></p>\`
			: "";

		const locationTypeHtml = locationType
			? \`<span style="display: inline-block; padding: 2px 8px; border-radius: 12px; background-color: rgba(255,255,255,0.1); font-size: 12px; margin-bottom: 4px;">\${escapeHtml(locationType)}</span><br/>\`
			: "";

		const instructionsHtml = instructions
			? \`<div style="margin-top: 12px; padding: 12px; background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 13px; color: #e8e8f0;">
					<strong>ℹ️ Instrucciones:</strong><br/>
					\${escapeHtml(instructions)}
				</div>\`
			: "";

		detailsHtml = \`
		<div style="margin-top: 24px; padding: 16px; background-color: #0c0c14; border-radius: 6px; text-align: left;">
			\${
				dateStr
					? \`<p style="margin: 0 0 8px 0; font-size: 14px; color: #e8e8f0;">📅 <strong>\${dateStr}</strong></p>\`
					: ""
			}
			\${eventLocation ? locationTypeHtml + locationHtml : ""}
			\${instructionsHtml}
		</div>
		\`;
	}

	const html = \`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>HACK IA</title>
</head>
<body style="background-color: #0c0c14; color: #e8e8f0; font-family: sans-serif; padding: 24px; text-align: center;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a24; padding: 32px; border-radius: 8px;">
    <h1 style="color: #6f5ff2; margin-top: 0;">¡Solicitud Recibida!</h1>
    <p style="font-size: 16px; line-height: 1.5;">Hola <strong>\${safeName}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.5;">Hemos recibido tu solicitud para participar en <strong>\${safeEventName}</strong>.</p>
    \${detailsHtml}
    <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Actualmente tu inscripción se encuentra en estado <strong style="color: #00cfaa;">Pendiente de Aprobación</strong>. Nos pondremos en contacto contigo pronto por este mismo medio con tu entrada oficial.</p>
  </div>
</body>
</html>
\`.trim();

	return {
		subject: \`Solicitud recibida para \${safeEventName}\`,
		html,
	};
}
