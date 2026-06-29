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
