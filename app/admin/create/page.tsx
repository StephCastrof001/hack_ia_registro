import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { createEvent } from "../actions";

export default async function CreateEventPage() {
	// Auth
	const auth = await createServerSupabase();
	const {
		data: { user },
	} = await auth.auth.getUser();

	if (!user?.email || !user.email_confirmed_at) {
		redirect("/admin/login");
	}
	const allowed = getEnv()
		.ADMIN_EMAILS.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	if (!allowed.includes(user.email.toLowerCase())) {
		redirect("/admin/login");
	}

	return (
		<div className="min-h-screen bg-[#0c0c14] text-[#e8e8f0] font-sans selection:bg-[#6f5ff2]/30 p-4 md:p-8 relative overflow-hidden">
			{/* Background Glows */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#6f5ff2]/10 rounded-full blur-[120px] pointer-events-none" />

			<div className="max-w-2xl mx-auto relative z-10">
				<header className="mb-10 flex flex-col gap-2">
					<a
						href="/admin"
						className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-4 transition-colors"
					>
						← Volver a Eventos
					</a>
					<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
						Crear Nuevo Evento
					</h1>
					<p className="mt-2 text-white/50">
						Configura los detalles del evento. Recuerda que para usar los campos nuevos debes crear las columnas en Supabase.
					</p>
				</header>

				<form action={createEvent} className="flex flex-col gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/10">
					<div className="flex flex-col gap-2">
						<label htmlFor="name" className="text-sm font-medium text-white/80">Nombre del Evento *</label>
						<input type="text" id="name" name="name" required placeholder="Ej: HACK IA 2026" className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors" />
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="slug" className="text-sm font-medium text-white/80">URL amigable (Slug) *</label>
						<input type="text" id="slug" name="slug" required placeholder="Ej: hackia-2026 (sin espacios)" className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors" />
						<p className="text-xs text-white/40">Este será el enlace público: hackia.klipso.lat/e/tu-slug</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="flex flex-col gap-2">
							<label htmlFor="event_date" className="text-sm font-medium text-white/80">Fecha y Hora de Inicio</label>
							<input type="datetime-local" id="event_date" name="event_date" className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors [color-scheme:dark]" />
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="end_date" className="text-sm font-medium text-white/80">Fecha y Hora de Fin</label>
							<input type="datetime-local" id="end_date" name="end_date" className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors [color-scheme:dark]" />
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="organizer" className="text-sm font-medium text-white/80">Organizador</label>
						<input type="text" id="organizer" name="organizer" placeholder="Ej: Klipso / HACK IA" className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors" />
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="flex flex-col gap-2">
							<label htmlFor="location_type" className="text-sm font-medium text-white/80">Tipo de Ubicación</label>
							<select id="location_type" name="location_type" className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors">
								<option value="Presencial">Presencial</option>
								<option value="Virtual">Virtual</option>
								<option value="Híbrido">Híbrido</option>
							</select>
						</div>
						<div className="flex flex-col gap-2">
							<label htmlFor="location" className="text-sm font-medium text-white/80">Lugar / Plataforma</label>
							<input type="text" id="location" name="location" placeholder="Ej: Pacífico Seguros SA o Zoom" className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors" />
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="location_url" className="text-sm font-medium text-white/80">Enlace de Ubicación (Google Maps o URL de Reunión)</label>
						<input type="url" id="location_url" name="location_url" placeholder="Ej: https://maps.google.com/..." className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors" />
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="instructions" className="text-sm font-medium text-white/80">Instrucciones de Ingreso</label>
						<input type="text" id="instructions" name="instructions" placeholder="Ej: Ingresas con tu QR y DNI físico" className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors" />
					</div>

					<div className="flex flex-col gap-2">
						<label htmlFor="description" className="text-sm font-medium text-white/80">Descripción del Evento</label>
						<textarea id="description" name="description" rows={3} placeholder="Detalles extra del evento..." className="bg-[#1a1a24] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6f5ff2] transition-colors resize-none"></textarea>
					</div>

					<div className="pt-4 border-t border-white/10 flex justify-end">
						<button type="submit" className="px-6 py-3 rounded-xl bg-[#6f5ff2] text-white font-bold hover:bg-[#5a4bd1] transition-colors shadow-[0_0_20px_rgba(111,95,242,0.3)] hover:shadow-[0_0_30px_rgba(111,95,242,0.5)]">
							Crear Evento
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
