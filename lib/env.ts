import { z } from "zod";

/**
 * Schema de variables de entorno (validación al boot, ADR stack v0.3).
 * NEXT_PUBLIC_* = expuestas al cliente; el resto solo server.
 */
const envSchema = z.object({
	NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
	SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
	RESEND_API_KEY: z.string().min(1),
	EMAIL_FROM: z.string().min(1),
	NEXT_PUBLIC_APP_URL: z.string().url(),
	// Allowlist de admins (emails separados por coma). Gate de autorización del dashboard.
	ADMIN_EMAILS: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/** Valida un objeto de env crudo. Lanza si falta o es inválida una var requerida. */
export function parseEnv(
	raw: NodeJS.ProcessEnv | Record<string, unknown>,
): Env {
	return envSchema.parse(raw);
}

let cached: Env | undefined;

/** Env validada de la app (cacheada). Falla rápido si falta una var requerida. */
export function getEnv(): Env {
	if (!cached) cached = parseEnv(process.env);
	return cached;
}
