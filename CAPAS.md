# CAPAS — matriz de capas × issues (v1)

> Pilar 7: declarar todas las dimensiones ANTES de codear, para que ninguna desaparezca del radar.
> Cada issue marca qué capas toca. AC agrupados por capa. Review gates evitan reproceso.

## Capas

| ID | Capa | Cubre | DoD de la capa |
|---|---|---|---|
| **D** | Datos | schema (SQL), Supabase client, `event_id` filter, RLS Supabase | migración aplica, query filtra por evento, unicidad de tokens |
| **A** | API/Lógica | providers, endpoints, state machine | endpoint responde con contrato; transición inválida rechazada |
| **U** | UX/Presentación | páginas, badge visual, brand HACK IA | demo visual aprobada en review gate (no rework) |
| **T** | Tests | unit, integración, smoke | comando verificable (curl/SQL/QR-decode/pixel), no prosa |
| **S** | Seguridad/Legal | tokens server-side, consent ADR-001, secrets, input | sin secrets en diff; token validado en server; consent registrado |
| **X** | Distribución | deploy, env, DNS, $0 | corre en runtime Vercel; costo $0 |

## Matriz capa × issue

| Issue | D | A | U | T | S | X | Review gate |
|---|:-:|:-:|:-:|:-:|:-:|:-:|---|
| #1 Scaffold + Supabase | ● | ● | · | ● | ● | ● | — |
| #2 Schema + state machine | ● | ● | · | ● | ● | · | — |
| #3 RegistroProvider + LumaProvider | ● | ● | · | ● | ● | · | — |
| #4 Magic link page | ● | ● | ● | ● | ● | · | UX: layout página |
| #5 Subir foto → Storage | ● | ● | ● | ● | ● | · | UX: flujo upload + consent |
| #10 **Prototipo badge (gate)** | · | · | ● | · | · | · | **UX: aprobar mockup ANTES de #6/#7** |
| #6 Badge render base (satori) | · | ● | ● | ● | ● | ● | UX: PNG vs prototipo |
| #7 QR + brand fino | · | ● | ● | ● | ● | · | UX: brand final + QR escanea |
| #8 Email Resend | · | ● | ● | ● | ● | ● | UX: plantilla email |
| #9 Deploy + smoke e2e | ● | ● | ● | ● | ● | ● | — |

`●` toca · `·` no aplica (pospuesto explícito).

## Review gates (anti-reproceso)

- **#10 antes de #6/#7**: prototipo del badge aprobado por owner → no se codea render sin layout/brand fijo.
- **UX gates (#4,5,6,7,8)**: cada PR adjunta screenshot/demo; merge solo con OK del owner.
- **Pospuesto a v2** (declarado, no olvidado): dashboard admin, certificados, state machine completa en DB, WhatsApp auto, check-in offline.

## Smoke test e2e (issue #9, < 2 min)

1. `import sample.csv` → `select count(*) from guests` == filas del CSV
2. abrir `/badge/{magic_token}` → 200 con nombre del guest
3. subir foto → `photo_url` not null, status avanza
4. `/api/og/badge` → `content-type: image/png`, bytes > 0, pixel esquina == `#0c0c14`
5. decode QR del PNG == `/checkin/{qr_token}` (≠ guest_id)
6. Resend devuelve id de envío
