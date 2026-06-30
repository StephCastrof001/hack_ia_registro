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
			<div className="p-8 max-w-4xl mx-auto text-white">
				<h1 className="text-3xl font-bold mb-6">Selecciona un Evento</h1>
				<div className="grid gap-4">
					{events?.map((ev) => (
						<a
							key={ev.id}
							href={`/admin?eventId=${ev.id}`}
							className="block p-6 rounded-lg border border-gray-800 bg-gray-900/50 hover:bg-gray-800 transition-colors"
						>
							<h2 className="text-xl font-semibold text-[#00cfaa] mb-2">
								{ev.name}
							</h2>
							<p className="text-sm text-gray-400 font-mono text-xs">
								Slug: {ev.slug}
							</p>
							<p className="text-sm text-gray-400 font-mono text-xs mt-1">
								ID: {ev.id}
							</p>
						</a>
					))}
					{!events?.length && (
						<p className="text-gray-500">No hay eventos creados.</p>
					)}
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
			<div className="p-8 max-w-4xl mx-auto text-red-500">
				Error cargando guests: {error.message}
			</div>
		);
	}

	return (
		<div className="p-8 max-w-4xl mx-auto text-white">
			<h1 className="text-3xl font-bold mb-8">Dashboard Admin</h1>

			<div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/50">
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="border-b border-gray-800 text-gray-400">
							<th className="p-4 font-medium">Nombre</th>
							<th className="p-4 font-medium">Email</th>
							<th className="p-4 font-medium">Estado</th>
							<th className="p-4 font-medium text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{guests?.map((guest) => (
							<tr
								key={guest.id}
								className="border-b border-gray-800/50 hover:bg-gray-800/20"
							>
								<td className="p-4">
									{guest.name} {guest.last_name || ""}
								</td>
								<td className="p-4 text-gray-400">{guest.email}</td>
								<td className="p-4">
									<span
										className={`px-2.5 py-1 rounded-full text-xs font-medium ${
											guest.status === "approved"
												? "bg-green-900/30 text-green-400"
												: guest.status === "rejected"
													? "bg-red-900/30 text-red-400"
													: "bg-gray-800 text-gray-300"
										}`}
									>
										{guest.status}
									</span>
								</td>
								<td className="p-4 flex gap-2 justify-end">
									{guest.status === "registered" && (
										<>
											<form
												action={async () => {
													"use server";
													await approveGuest(guest.id, eventId);
												}}
											>
												<button
													type="submit"
													className="px-3 py-1.5 bg-green-600/90 hover:bg-green-500 text-white rounded text-sm transition-colors"
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
													className="px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded text-sm transition-colors"
												>
													Rechazar
												</button>
											</form>
										</>
									)}
								</td>
							</tr>
						))}
						{!guests?.length && (
							<tr>
								<td colSpan={4} className="p-8 text-center text-gray-500">
									No hay invitados registrados para este evento.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
