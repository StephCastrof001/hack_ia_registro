import Image from "next/image";
import { notFound } from "next/navigation";
import { PhotoUpload } from "@/components/photo-upload";
import logo from "@/Logo/hackia_primary_dark.svg";
import { getGuestByMagicToken } from "@/lib/magic";

// Página self-service del invitado (#4). Autenticada por magic_token (sin cuenta).
export default async function BadgePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const guest = await getGuestByMagicToken(token);
	if (!guest) notFound();

	const fullName = [guest.name, guest.last_name].filter(Boolean).join(" ");

	return (
		<main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 bg-[#0c0c14] px-5 py-12 text-[#e8e8f0]">
			<header className="flex flex-col gap-1 items-start">
				<Image src={logo} alt="HACK IA" height={24} className="mb-2 w-auto" />
				<h1 className="text-2xl font-bold">Hola, {fullName}</h1>
			</header>

			{guest.status === "approved" && (
				<section className="flex flex-col gap-3">
					<p className="text-sm text-white/80">
						Estás aprobado 🎉 Subí tu foto para generar tu badge.
					</p>
					<PhotoUpload magicToken={token} />
				</section>
			)}

			{guest.status === "badge_ready" && (
				<section className="flex flex-col items-center gap-3">
					<p className="text-sm text-white/80">Tu badge está listo.</p>
					{guest.photo_url && (
						// biome-ignore lint/performance/noImgElement: preview simple, no Next/Image
						<img
							src={guest.photo_url}
							alt="Tu foto"
							className="h-32 w-32 rounded-full object-cover"
						/>
					)}
				</section>
			)}

			{guest.status === "registered" && (
				<p className="text-sm text-white/80">
					Tu solicitud está pendiente de aprobación. Te avisamos por email.
				</p>
			)}

			{(guest.status === "rejected" || guest.status === "canceled") && (
				<p className="text-sm text-white/80">
					Esta inscripción no está activa.
				</p>
			)}
		</main>
	);
}
