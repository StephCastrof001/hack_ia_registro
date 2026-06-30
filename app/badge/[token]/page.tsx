import Image from "next/image";
import { notFound } from "next/navigation";
import { MeshBg } from "@/components/mesh-bg";
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
		<>
			<MeshBg />
			<main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-12 text-[#e8e8f0]">
				<header className="flex flex-col items-start gap-3">
					<Image src={logo} alt="HACK IA" height={26} className="w-auto" />
					<h1 className="text-3xl font-bold tracking-tight">
						Hola, <span className="text-[#6f5ff2]">{fullName}</span>
					</h1>
				</header>

				{guest.status === "approved" && (
					<section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
						<p className="text-sm leading-relaxed text-white/80">
							Estás{" "}
							<span className="font-semibold text-[#00cfaa]">aprobado</span> 🎉
							Subí tu foto para generar tu badge.
						</p>
						<PhotoUpload magicToken={token} />
					</section>
				)}

				{guest.status === "badge_ready" && (
					<section className="flex flex-col items-center gap-4 rounded-2xl border border-[#00cfaa]/25 bg-[#00cfaa]/[0.06] p-5 text-center">
						<p className="font-semibold text-[#00cfaa]">
							Tu badge está listo 🎫
						</p>
						{/* Badge real (con QR) — lo que mostrás en la puerta */}
						{/* biome-ignore lint/performance/noImgElement: PNG dinámico de satori */}
						<img
							src={`/api/badge/${token}`}
							alt="Tu badge HACK IA"
							className="w-full max-w-[280px] rounded-2xl border border-white/10 shadow-[0_0_32px_rgba(111,95,242,0.25)]"
						/>
						<a
							href={`/api/badge/${token}?download=1`}
							download="badge-hackia.png"
							className="w-full rounded-xl bg-[#6f5ff2] px-4 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(111,95,242,0.35)] transition-all hover:bg-[#5a4be0]"
						>
							Descargar para compartir
						</a>
						<p className="text-xs leading-relaxed text-white/50">
							El QR es solo para la puerta. La versión que descargás para redes va
							sin QR.
						</p>
					</section>
				)}

				{guest.status === "registered" && (
					<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-relaxed text-white/75">
						Tu solicitud está{" "}
						<span className="font-semibold text-white/90">
							pendiente de aprobación
						</span>
						. Te avisamos por email.
					</div>
				)}

				{(guest.status === "rejected" || guest.status === "canceled") && (
					<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
						Esta inscripción no está activa.
					</div>
				)}
			</main>
		</>
	);
}
