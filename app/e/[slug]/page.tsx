import Image from "next/image";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import logo from "@/Logo/hackia_primary_dark.svg";
import { getEventBySlug } from "@/lib/events";

// Página pública del evento (#13). Server Component: lee el evento y muestra el form.
export default async function EventPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const event = await getEventBySlug(slug);
	if (!event) notFound();

	// Formatear rango de fechas (ej: miércoles, 22 de julio 8:30 - 13:00)
	let dateStr = "";
	if (event.event_date) {
		const startDate = new Date(event.event_date);
		dateStr = startDate.toLocaleDateString("es-PE", {
			weekday: "long",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});

		if (event.end_date) {
			const endDate = new Date(event.end_date);
			// Si es el mismo día, solo añadimos la hora de fin. Si es distinto, añadimos todo.
			if (
				startDate.toLocaleDateString() === endDate.toLocaleDateString()
			) {
				dateStr += ` - ${endDate.toLocaleTimeString("es-PE", {
					hour: "2-digit",
					minute: "2-digit",
				})}`;
			} else {
				dateStr += ` hasta ${endDate.toLocaleDateString("es-PE", {
					weekday: "long",
					month: "long",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				})}`;
			}
		}
	}

	return (
		<main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 bg-[#0c0c14] px-5 py-12 text-[#e8e8f0]">
			<header className="flex flex-col gap-1 items-start">
				<Image src={logo} alt="HACK IA" height={24} className="mb-2 w-auto" />
				<h1 className="text-3xl font-bold">{event.name}</h1>
				{event.organizer && (
					<p className="text-sm text-white/60">Organiza: {event.organizer}</p>
				)}
				{dateStr && <p className="text-sm text-white/60">{dateStr}</p>}
				
				{event.location && (
					<div className="text-sm text-white/60 mt-1 flex flex-col gap-1">
						{event.location_type && (
							<span className="inline-block px-2 py-0.5 rounded-full bg-white/10 text-xs w-fit">
								{event.location_type}
							</span>
						)}
						{event.location_url ? (
							<a
								href={event.location_url}
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-[#6f5ff2] hover:underline flex items-center gap-1 mt-1"
							>
								📍 {event.location}
							</a>
						) : (
							<span className="mt-1 flex items-center gap-1">📍 {event.location}</span>
						)}
					</div>
				)}

				{event.instructions && (
					<div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 w-full">
						<strong>ℹ️ Instrucciones:</strong><br/>
						{event.instructions}
					</div>
				)}

				{event.description && (
					<p className="mt-2 text-sm text-white/80">{event.description}</p>
				)}
			</header>

			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">Solicitar unirse</h2>
				<RegisterForm eventId={event.id} fields={event.form_fields ?? []} />
			</section>
		</main>
	);
}
