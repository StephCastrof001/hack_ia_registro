import { z } from "zod";

/**
 * Validación del formulario de registro (P2). Base: name + email.
 * DNI 8 dígitos, RUC 11 dígitos (formato local, sin RENIEC/SUNAT — P9/Q9).
 * La obligatoriedad de extras por evento se aplica encima (form_fields, #14).
 */
export const registerSchema = z.object({
	name: z.string().min(1),
	last_name: z.string().optional(),
	email: z.string().email(),
	role: z.string().optional(),
	company: z.string().optional(),
	phone: z.string().optional(),
	dni: z
		.string()
		.regex(/^\d{8}$/, "DNI debe tener 8 dígitos")
		.optional(),
	ruc: z
		.string()
		.regex(/^\d{11}$/, "RUC debe tener 11 dígitos")
		.optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
