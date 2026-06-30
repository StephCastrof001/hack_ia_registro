import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import {
	createAdminSupabase,
	createServerSupabase,
} from "@/lib/supabase/server";
import { approveGuest, rejectGuest } from "./actions";

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

	// Datos con service_role (la lectura de guests está bloqueada para anon por RLS).
	const sb = createAdminSupabase();

	if (!eventId) {
		const { data: events } = await sb
			.from("events")
			.select("id, slug, name")
			.order("created_at", { ascending: false });

		return (
			<div className="min-h-screen bg-[#0c0c14] text-[#e8e8f0] font-sans selection:bg-[#6f5ff2]/30 p-6 md:p-12 relative overflow-hidden">
				{/* Background Glows */}
				<div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#6f5ff2]/20 rounded-full blur-[120px] pointer-events-none" />
				<div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#00cfaa]/10 rounded-full blur-[120px] pointer-events-none" />
				
				<div className="max-w-5xl mx-auto relative z-10">
					<header className="mb-12 flex items-center justify-between">
						<div>
							<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
								Eventos Activos
							</h1>
							<p className="mt-3 text-lg text-white/50">
								Selecciona un evento para gestionar sus invitados.
							</p>
						</div>
					</header>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{events?.map((ev) => (
							<a
								key={ev.id}
								href={`/admin?eventId=${ev.id}`}
								className="group relative block p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-[#6f5ff2]/50 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(111,95,242,0.15)]"
							>
								<div className="absolute inset-0 bg-gradient-to-br from-[#6f5ff2]/0 via-transparent to-[#6f5ff2]/0 group-hover:from-[#6f5ff2]/10 transition-all duration-500" />
								<div className="relative z-10">
									<div className="w-12 h-12 rounded-full bg-[#6f5ff2]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
										<span className="text-2xl">📅</span>
									</div>
									<h2 className="text-2xl font-bold text-white mb-2 group-hover:text-[#6f5ff2] transition-colors">
										{ev.name}
									</h2>
									<p className="text-sm text-white/40 font-mono">/{ev.slug}</p>
								</div>
							</a>
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

	const { data: guests, error } = await sb
		.from("guests")
		.select("id, name, last_name, email, status")
		.eq("event_id", eventId)
		.order("created_at", { ascending: false });

	if (error) {
		return (
			<div className="min-h-screen bg-[#0c0c14] flex items-center justify-center p-8 text-red-400">
				Error cargando guests: {error.message}
			</div>
		);
	}

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
					<div className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05] text-sm text-white/60">
						Total: <strong className="text-white">{guests?.length || 0}</strong>
					</div>
				</header>

				<div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl">
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse whitespace-nowrap">
							<thead>
								<tr className="border-b border-white/[0.05] bg-white/[0.03]">
									<th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-white/40">Invitado</th>
									<th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-white/40">Email</th>
									<th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-white/40">Estado</th>
									<th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-white/40 text-right">Acción</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/[0.02]">
								{guests?.map((guest) => (
									<tr
										key={guest.id}
										className="group hover:bg-white/[0.04] transition-colors"
									>
										<td className="px-6 py-4">
											<div className="font-medium text-white group-hover:text-[#6f5ff2] transition-colors">
												{guest.name} {guest.last_name || ""}
											</div>
										</td>
										<td className="px-6 py-4 text-sm text-white/50 font-mono">
											{guest.email}
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${
													guest.status === "approved"
														? "bg-[#00cfaa]/10 text-[#00cfaa] border-[#00cfaa]/20 shadow-[0_0_10px_rgba(0,207,170,0.2)]"
														: guest.status === "rejected"
															? "bg-red-500/10 text-red-400 border-red-500/20"
															: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
												}`}
											>
												{guest.status === "registered" ? "pendiente" : guest.status}
											</span>
										</td>
										<td className="px-6 py-4 text-right">
											{guest.status === "registered" ? (
												<div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
													<form
														action={async () => {
															"use server";
															await approveGuest(guest.id, eventId);
														}}
													>
														<button
															type="submit"
															className="px-4 py-1.5 rounded-lg bg-[#6f5ff2] hover:bg-[#5b4be0] text-white text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(111,95,242,0.4)]"
														>
															Aprobar
														</button>
													</form>
													<form
														action={async () => {
															"use server";
															await rejectGuest(guest.id, eventId);
														}}
													>
														<button
															type="submit"
															className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-sm font-medium transition-colors"
														>
															✕
														</button>
													</form>
												</div>
											) : (
												<span className="text-white/20 text-sm">--</span>
											)}
										</td>
									</tr>
								))}
								{!guests?.length && (
									<tr>
										<td colSpan={4} className="px-6 py-12 text-center">
											<div className="inline-flex flex-col items-center justify-center text-white/30">
												<span className="text-4xl mb-3">📭</span>
												<p>Nadie se ha registrado todavía.</p>
											</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
