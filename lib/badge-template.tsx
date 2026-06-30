/**
 * Template del badge HACK IA (issue #6/#7). Look A "Clean Mesh" — gate UX #10 aprobado.
 * Render server-side vía next/og (satori). Solo flexbox + estilos inline (restricción satori).
 *
 * Reglas del verdicto (#10):
 *  - Mensaje "Asistiré al lanzamiento de la comunidad [LOGO]" arriba, en AMBAS vistas.
 *  - qrDataUrl presente  => vista PANTALLA (entrada, con QR).
 *  - qrDataUrl ausente    => vista DESCARGA/COMPARTIR (sin QR). El QR nunca viaja en redes.
 */

const C = {
	canvas: "#0c0c14",
	primary: "#6f5ff2",
	accent: "#00cfaa",
	text: "#e8e8f0",
	muted: "#9a9ab0",
	qrbg: "#ffffff",
} as const;

// Mesh dinámico satori-safe: gradientes radiales apilados sobre el canvas negro.
const MESH = [
	`radial-gradient(300px 300px at 18% 10%, rgba(111,95,242,0.40), transparent 70%)`,
	`radial-gradient(360px 360px at 88% 18%, rgba(0,207,170,0.26), transparent 70%)`,
	`radial-gradient(480px 440px at 50% 118%, rgba(111,95,242,0.34), transparent 70%)`,
].join(", ");

export interface BadgeTemplateProps {
	displayName: string;
	role: string | null;
	company: string | null;
	photoUrl: string | null;
	/** Logo HACK IA como data URL (PNG en base64). */
	logoDataUrl: string;
	/** QR como data URL. Si se omite => badge SIN QR (descarga/redes). */
	qrDataUrl?: string;
}

export function BadgeTemplate({
	displayName,
	role,
	company,
	photoUrl,
	logoDataUrl,
	qrDataUrl,
}: BadgeTemplateProps): React.ReactElement {
	const showQr = Boolean(qrDataUrl);

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				textAlign: "center",
				padding: "48px 48px",
				backgroundColor: C.canvas,
				backgroundImage: MESH,
				color: C.text,
				fontFamily: "Space Grotesk",
			}}
		>
			{/* Mensaje arriba + logo (en ambas vistas) */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 12,
				}}
			>
				<div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.3 }}>
					Asistiré al lanzamiento de la comunidad
				</div>
				{/* biome-ignore lint/performance/noImgElement: satori solo soporta <img> */}
				<img src={logoDataUrl} height={64} alt="HACK IA" />
			</div>

			{/* Foto circular */}
			<div
				style={{
					display: "flex",
					width: 240,
					height: 240,
					borderRadius: 9999,
					marginTop: 28,
					border: `6px solid ${C.primary}`,
					backgroundColor: "#1a1a26",
					overflow: "hidden",
				}}
			>
				{photoUrl ? (
					// biome-ignore lint/performance/noImgElement: satori solo soporta <img>
					<img
						src={photoUrl}
						width={240}
						height={240}
						alt=""
						style={{ objectFit: "cover" }}
					/>
				) : null}
			</div>

			{/* Nombre + línea + rol/empresa */}
			<div style={{ fontSize: 58, fontWeight: 700, marginTop: 24 }}>
				{displayName}
			</div>
			<div
				style={{
					width: 96,
					height: 8,
					borderRadius: 4,
					marginTop: 18,
					backgroundColor: C.primary,
				}}
			/>
			{role ? (
				<div style={{ fontSize: 32, color: C.accent, marginTop: 14 }}>
					{role}
				</div>
			) : null}
			{company ? (
				<div style={{ fontSize: 26, color: C.muted, marginTop: 6 }}>
					{company}
				</div>
			) : null}

			{/* Pie: QR (pantalla) o hashtag (descarga) */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					marginTop: "auto",
					gap: 14,
				}}
			>
				{showQr ? (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 14,
						}}
					>
						<div
							style={{
								fontSize: 20,
								letterSpacing: 3,
								color: C.muted,
								textTransform: "uppercase",
							}}
						>
							Entrada · escanear en puerta
						</div>
						<div
							style={{
								display: "flex",
								padding: 14,
								borderRadius: 24,
								backgroundColor: C.qrbg,
							}}
						>
							{/* biome-ignore lint/performance/noImgElement: satori solo soporta <img> */}
							<img src={qrDataUrl} width={180} height={180} alt="QR" />
						</div>
					</div>
				) : (
					<div
						style={{
							fontSize: 24,
							letterSpacing: 4,
							color: C.accent,
							fontWeight: 700,
						}}
					>
						#HACKIA
					</div>
				)}
			</div>
		</div>
	);
}
