import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { buildBadgeFields } from "@/lib/badge-fields";
import { BadgeTemplate } from "@/lib/badge-template";
import { makeCheckinQr } from "@/lib/checkin-qr";
import { getEnv } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/server";

// next/og + lectura de fuente/logo del filesystem => runtime Node, no edge.
export const runtime = "nodejs";

interface BadgeGuest {
	name: string;
	last_name: string | null;
	role: string | null;
	company: string | null;
	photo_url: string | null;
	qr_token: string;
}

function fileToDataUrl(relPath: string, mime: string): string {
	const buf = fs.readFileSync(path.join(process.cwd(), relPath));
	return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * GET /api/badge/[token]  (token = magic_token del invitado)
 *   - default        => badge PANTALLA con QR (escanear en puerta)
 *   - ?download=1     => badge DESCARGA/COMPARTIR sin QR (no filtra el QR en redes)
 */
export async function GET(
	req: Request,
	{ params }: { params: Promise<{ token: string }> },
): Promise<Response> {
	const { token } = await params;

	const sb = createAdminSupabase();
	const { data, error } = await sb
		.from("guests")
		.select("name, last_name, role, company, photo_url, qr_token")
		.eq("magic_token", token)
		.maybeSingle();

	if (error || !data) {
		return new Response("Not found", { status: 404 });
	}
	const guest = data as BadgeGuest;

	const download = new URL(req.url).searchParams.get("download") === "1";
	const { displayName } = buildBadgeFields(guest);

	// QR solo en la vista pantalla. En descarga se omite (artificio anti-reuso de screenshot).
	const qrDataUrl = download
		? undefined
		: await makeCheckinQr(getEnv().NEXT_PUBLIC_APP_URL, guest.qr_token);

	const logoDataUrl = fileToDataUrl(
		"Logo/hackia_primary_dark.png",
		"image/png",
	);
	const fontData = fs.readFileSync(
		path.join(process.cwd(), "assets/fonts/SpaceGrotesk-700.woff"),
	);

	return new ImageResponse(
		BadgeTemplate({
			displayName,
			role: guest.role,
			company: guest.company,
			photoUrl: guest.photo_url,
			logoDataUrl,
			qrDataUrl,
		}),
		{
			width: 720,
			height: 1080,
			fonts: [
				{ name: "Space Grotesk", data: fontData, weight: 700, style: "normal" },
			],
		},
	);
}
