"use client";

import type { IScannerControls } from "@zxing/browser";
import { BrowserQRCodeReader } from "@zxing/browser";
import { use, useEffect, useRef, useState } from "react";

export default function ScanPage(props: {
	searchParams: Promise<{ eventId?: string }>;
}) {
	const searchParams = use(props.searchParams);
	const eventId = searchParams.eventId;

	const videoRef = useRef<HTMLVideoElement>(null);
	const [status, setStatus] = useState<string>("Iniciando cámara...");
	const [lastResult, setLastResult] = useState<{
		ok: boolean;
		message: string;
	} | null>(null);

	useEffect(() => {
		if (!eventId || !videoRef.current) return;

		const codeReader = new BrowserQRCodeReader();
		let controls: IScannerControls | undefined;
		let isProcessing = false;
		let mounted = true;

		const startCamera = async () => {
			const videoElement = videoRef.current;
			if (!videoElement) return;

			try {
				controls = await codeReader.decodeFromVideoDevice(
					undefined,
					videoElement,
					async (result) => {
						if (result && !isProcessing && mounted) {
							isProcessing = true;
							setStatus("Procesando QR...");

							const text = result.getText();
							// Extraer qr_token si viene formato /r/TOKEN
							const match = text.match(/\/r\/([^/?]+)/);
							const qrToken = match ? match[1] : text;

							try {
								const res = await fetch("/api/checkin", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ qrToken, eventId }),
								});

								if (!mounted) return;

								if (res.status === 200) {
									const data = await res.json();
									setLastResult({
										ok: true,
										message: `Check-in exitoso: ${data.guest.name}`,
									});
								} else if (res.status === 409) {
									setLastResult({
										ok: false,
										message: "Error: Ya está checked in",
									});
								} else {
									setLastResult({
										ok: false,
										message: "Error: Token inválido",
									});
								}
							} catch {
								if (mounted) {
									setLastResult({ ok: false, message: "Error de conexión" });
								}
							}

							if (mounted) {
								setTimeout(() => {
									if (mounted) {
										isProcessing = false;
										setLastResult(null);
										setStatus("Buscando QR...");
									}
								}, 3000);
							}
						}
					},
				);
				if (mounted) {
					setStatus("Buscando QR...");
				}
			} catch {
				if (mounted) {
					setStatus("Error iniciando cámara. Verifica permisos.");
				}
			}
		};

		startCamera();

		return () => {
			mounted = false;
			if (controls) {
				controls.stop();
			}
		};
	}, [eventId]);

	if (!eventId) {
		return (
			<div className="p-8 text-red-500 font-bold">
				Error: Falta ?eventId=UUID en la URL
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center p-8 max-w-md mx-auto text-white">
			<h1 className="text-2xl font-bold mb-4">Escanear Check-in</h1>

			<div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-700">
				<video ref={videoRef} className="w-full h-full object-cover" muted />
				<div className="absolute inset-0 pointer-events-none border-2 border-white/20"></div>
			</div>

			<p className="mt-6 text-gray-400 font-medium">{status}</p>

			{lastResult && (
				<div
					className={`mt-4 p-4 rounded-lg text-center w-full font-bold shadow-lg transition-all ${
						lastResult.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
					}`}
				>
					{lastResult.message}
				</div>
			)}
		</div>
	);
}
