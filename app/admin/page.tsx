import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { getEvents, getEventGuests } from "@/lib/api/admin";
import { EventCard } from "@/components/admin/EventCard";
import { GuestTable } from "@/components/admin/GuestTable";

export default async function AdminPage(props: {
	searchParams: Promise<{ eventId?: string }>;
}) {
	const searchParams = await props.searchParams;
	const eventId = searchParams.eventId;

	// Auth con cliente anon (sesión cookie); autorización por allowlist.
	const auth = await createServerSupabase();
	const {
		data: { user },
	} = await auth.auth.getUser();

	// email_confirmed_at: evita spoofing de email no verificado contra la allowlist.
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

	if (!eventId) {
		const events = await getEvents();
		return (
			<div className="min-h-screen bg-[#0c0c14] text-[#e8e8f0] font-sans selection:bg-[#6f5ff2]/30 p-6 md:p-12 relative overflow-hidden">
				{/* Background Glows */}
				<div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#6f5ff2]/20 rounded-full blur-[120px] pointer-events-none" />
				<div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#00cfaa]/10 rounded-full blur-[120px] pointer-events-none" />
				
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
							<div>
								<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
									Eventos Activos
								</h1>
								<p className="mt-3 text-lg text-white/50">
									Selecciona un evento para gestionar sus invitados.
								</p>
							</div>
							<a
								href="/admin/create"
								className="px-5 py-3 rounded-xl bg-[#6f5ff2] text-white font-bold hover:bg-[#5a4bd1] transition-colors shadow-[0_0_20px_rgba(111,95,242,0.3)] hover:shadow-[0_0_30px_rgba(111,95,242,0.5)] self-start md:self-center"
							>
								+ Crear Evento
							</a>
						</div>
					</header>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{events?.map((ev) => (
							<EventCard key={ev.id} ev={ev} />
						))}
						{!events?.length && (
							<div className="col-span-full p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
								<p className="text-white/40 text-lg">No hay eventos creados.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	try {
		const guests = await getEventGuests(eventId);

		return (
			<div className="min-h-screen bg-[#0c0c14] text-[#e8e8f0] font-sans selection:bg-[#6f5ff2]/30 p-4 md:p-8 relative overflow-hidden">
				{/* Background Glows */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#6f5ff2]/10 rounded-full blur-[120px] pointer-events-none" />

				<div className="max-w-6xl mx-auto relative z-10">
					<header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
						<div>
							<a
								href="/admin"
								className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-4 transition-colors"
							>
								← Volver a Eventos
							</a>
							<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
								Panel de Invitados
							</h1>
							<p className="mt-2 text-white/50">Gestiona los accesos al evento.</p>
						</div>
						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
							<a
								href={`/admin/export?eventId=${eventId}`}
								target="_blank"
								rel="noopener noreferrer"
								className="px-4 py-2.5 rounded-lg bg-[#00cfaa]/10 text-[#00cfaa] border border-[#00cfaa]/20 hover:bg-[#00cfaa]/20 transition-colors font-semibold text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(0,207,170,0.1)] hover:shadow-[0_0_20px_rgba(0,207,170,0.2)]"
							>
								📥 Exportar CSV
							</a>
							<div className="px-4 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-sm text-white/60">
								Total: <strong className="text-white">{guests?.length || 0}</strong>
							</div>
						</div>
					</header>

					<GuestTable guests={guests} eventId={eventId} />
				</div>
			</div>
		);
	} catch (error) {
		return (
			<div className="min-h-screen bg-[#0c0c14] flex items-center justify-center p-8 text-red-400">
				Error cargando guests: {error instanceof Error ? error.message : String(error)}
			</div>
		);
	}
}
