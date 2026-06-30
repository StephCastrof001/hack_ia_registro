import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Cierra el flujo magic-link (PKCE) de Supabase: intercambia el `code` por sesión
 * y setea las cookies. Sin esta route el link del email termina en 404 y la sesión
 * nunca se establece. El verifier PKCE lo guarda el browser client en cookie (@supabase/ssr).
 */
export async function GET(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const rawNext = url.searchParams.get("next") ?? "/admin";
	// Anti open-redirect: solo path relativo same-origin (rechaza //host y URLs absolutas).
	const next =
		rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/admin";

	if (code) {
		const sb = await createServerSupabase();
		const { error } = await sb.auth.exchangeCodeForSession(code);
		if (!error) {
			return NextResponse.redirect(new URL(next, url.origin));
		}
	}

	return NextResponse.redirect(new URL("/admin/login?error=auth", url.origin));
}
