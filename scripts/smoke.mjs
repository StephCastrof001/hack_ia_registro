import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error(
		"Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
	);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSmokeTest() {
	let passed = 0;
	let failed = 0;
	let testGuestId = null;
	let testGuestQrToken = null;
	let testGuestMagicToken = null;

	function report(level, isPass, detail) {
		if (isPass) {
			passed++;
			console.log(`[PASS] ${level}: ${detail}`);
		} else {
			failed++;
			console.error(`[FAIL] ${level}: ${detail}`);
		}
	}

	try {
		// Buscar event test1
		const { data: event, error: eventErr } = await supabase
			.from("events")
			.select("id")
			.eq("slug", "test1")
			.single();

		if (eventErr || !event) {
			throw new Error(
				"No se pudo encontrar el evento test1 para hacer las pruebas.",
			);
		}
		const eventId = event.id;
		const testEmail = `smoketest_${Date.now()}@example.com`;

		// L1: POST /api/register con guest de prueba
		const l1Res = await fetch(`${BASE_URL}/api/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				eventId,
				name: "Smoke",
				last_name: "Test",
				email: testEmail,
			}),
		});

		if (l1Res.status === 201) {
			const { data: guest } = await supabase
				.from("guests")
				.select("*")
				.eq("email", testEmail)
				.eq("event_id", eventId)
				.single();

			if (guest && guest.status === "registered") {
				testGuestId = guest.id;
				report("L1", true, "Registro exitoso y status=registered en DB");
			} else {
				report(
					"L1",
					false,
					"Registro devolvió 201 pero no está status=registered en DB",
				);
			}
		} else {
			report("L1", false, `Registro falló con status ${l1Res.status}`);
		}

		// L1neg: POST /api/register inválido
		const l1negRes = await fetch(`${BASE_URL}/api/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ eventId }), // falta name, email
		});
		if (l1negRes.status === 400) {
			report("L1neg", true, "Registro inválido rechazado con 400");
		} else {
			report(
				"L1neg",
				false,
				`Registro inválido falló con status ${l1negRes.status} esperado 400`,
			);
		}

		if (!testGuestId) {
			throw new Error("No se puede continuar sin un guest de prueba creado");
		}

		// L2: marca el guest a 'approved' vía supabase-js
		const { data: approvedGuest, error: l2Err } = await supabase
			.from("guests")
			.update({ status: "approved" })
			.eq("id", testGuestId)
			.select()
			.single();

		if (!l2Err && approvedGuest && approvedGuest.status === "approved") {
			report("L2", true, "Guest actualizado a approved simulando workflow");
		} else {
			report(
				"L2",
				false,
				"No se pudo actualizar el status del guest a approved",
			);
		}

		// Forzar status a 'badge_ready' para simular que el badge fue generado
		// Así los endpoints de checkin (L5) pueden funcionar correctamente,
		// ya que la state machine de checkin requiere 'badge_ready'
		const { data: readyGuest, error: forceErr } = await supabase
			.from("guests")
			.update({ status: "badge_ready" })
			.eq("id", testGuestId)
			.select()
			.single();

		if (!forceErr && readyGuest) {
			testGuestQrToken = readyGuest.qr_token;
			testGuestMagicToken = readyGuest.magic_token;
		}

		// L4: GET /api/badge/{magic_token}
		const l4Res = await fetch(`${BASE_URL}/api/badge/${testGuestMagicToken}`);
		if (
			l4Res.status === 200 &&
			l4Res.headers.get("content-type")?.includes("image/png")
		) {
			report("L4", true, "GET /api/badge/{magic_token} exitoso");
		} else {
			report(
				"L4",
				false,
				`Fallo GET /api/badge/{magic_token}, status=${l4Res.status} type=${l4Res.headers.get("content-type")}`,
			);
		}

		// L4: GET /api/badge/{magic_token}?download=1
		const l4dlRes = await fetch(
			`${BASE_URL}/api/badge/${testGuestMagicToken}?download=1`,
		);
		if (
			l4dlRes.status === 200 &&
			l4dlRes.headers.get("content-type")?.includes("image/png")
		) {
			report("L4", true, "GET /api/badge/{magic_token}?download=1 exitoso");
		} else {
			report("L4", false, `Fallo GET /api/badge/{magic_token}?download=1`);
		}

		// L4neg
		const l4negRes = await fetch(`${BASE_URL}/api/badge/token-basura`);
		if (l4negRes.status === 404) {
			report("L4neg", true, "Token inválido badge rechazado con 404");
		} else {
			report(
				"L4neg",
				false,
				`Fallo GET /api/badge/token-basura, status=${l4negRes.status}`,
			);
		}

		// L5: POST /api/checkin
		const l5Res = await fetch(`${BASE_URL}/api/checkin`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ qrToken: testGuestQrToken, eventId }),
		});
		if (l5Res.status === 200) {
			const json = await l5Res.json();
			if (json.guest && json.guest.status === "checked_in") {
				report("L5", true, "POST /api/checkin con éxito (checked_in)");
			} else {
				report(
					"L5",
					false,
					"POST /api/checkin devolvió 200 pero sin status checked_in",
				);
			}
		} else {
			report("L5", false, `POST /api/checkin falló con status=${l5Res.status}`);
		}

		// L5 repite
		const l5RepRes = await fetch(`${BASE_URL}/api/checkin`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ qrToken: testGuestQrToken, eventId }),
		});
		if (l5RepRes.status === 409) {
			report("L5", true, "POST /api/checkin duplicado rechazado con 409");
		} else {
			report(
				"L5",
				false,
				`POST /api/checkin duplicado falló con status=${l5RepRes.status}`,
			);
		}

		// L5neg
		const l5negRes = await fetch(`${BASE_URL}/api/checkin`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ qrToken: "basura", eventId }),
		});
		if (l5negRes.status === 404) {
			report("L5", true, "POST /api/checkin token basura rechazado con 404");
		} else {
			report(
				"L5",
				false,
				`POST /api/checkin token basura falló con status=${l5negRes.status}`,
			);
		}
	} catch (e) {
		console.error("Error en ejecución de script:", e);
	} finally {
		// Cleanup
		if (testGuestId) {
			await supabase.from("guests").delete().eq("id", testGuestId);
			console.log(`[CLEANUP] Guest ${testGuestId} eliminado de DB.`);
		}

		console.log(`\nResumen final: ${passed}/${passed + failed} niveles PASS`);
		if (failed > 0) {
			process.exit(1);
		} else {
			process.exit(0);
		}
	}
}

runSmokeTest();
