import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { approveGuest, rejectGuest } from "./actions";

export default async function AdminPage(props: {
	searchParams: Promise<{ eventId?: string }>;
}) {
	const searchParams = await props.searchParams;
	const eventId = searchParams.eventId;

	const sb = await createServerSupabase();
	const {
		data: { user },
	} = await sb.auth.getUser();

	if (!user) {
		redirect("/admin/login");
	}

	if (!eventId) {
		return (
			<div className="p-8 max-w-4xl mx-auto text-white">
				<h1 className="text-2xl font-bold text-red-500 mb-4">
					Error: Falta eventId
				</h1>
				<p>
					Por favor, incluye el ID del evento en la URL:{" "}
					<code>?eventId=TU_UUID</code>
				</p>
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
