import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

/**
 * Cliente Supabase para SERVER (route handlers, server actions).
 * Maneja sesiones por cookies SSR usando la clave ANON_KEY.
 */
export async function createServerSupabase() {
	const env = getEnv();
	const cookieStore = await cookies();

	return createServerClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				get(name: string) {
					return cookieStore.get(name)?.value;
				},
				set(name: string, value: string, options: CookieOptions) {
					try {
						cookieStore.set({ name, value, ...options });
					} catch {
						// Ignorado en Server Components (solo lectura)
					}
				},
				remove(name: string, options: CookieOptions) {
					try {
						cookieStore.set({ name, value: "", ...options });
					} catch {
						// Ignorado en Server Components (solo lectura)
					}
				},
			},
		},
	);
}

/**
 * Cliente Supabase para SERVER usando SERVICE_ROLE.
 * Bypasea RLS. NUNCA exponer al cliente. No maneja sesión (persistSession: false).
 */
export function createAdminSupabase() {
	const env = getEnv();
	return createServerClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.SUPABASE_SERVICE_ROLE_KEY,
		{
			cookies: {
				get() {
					return undefined;
				},
				set() {},
				remove() {},
			},
			auth: { persistSession: false },
		},
	);
}
