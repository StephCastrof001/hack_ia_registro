import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para BROWSER (componentes 'use client').
 * Solo claves públicas (anon). Next inyecta las NEXT_PUBLIC_* en build.
 */
export function createBrowserSupabase() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !anon) {
		throw new Error(
			"Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
		);
	}
	return createBrowserClient(url, anon);
}
