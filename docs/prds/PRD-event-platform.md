# PRD — Plataforma de Eventos HACK IA (registro → badge → check-in)

> Estilo `/to-prd` (mattpocock). Síntesis de la conversación, sin re-entrevista.
> Estado: **v0.3** · Fecha: 2026-06-28 · Owner: Stephanie · Marca: HACK IA
> v0.3 = **pivote a sistema inhouse** (registro propio + aprobación + QR propio + check-in).
> Luma pasa a **seed/plan B** detrás del puerto. Ver decisiones P1-P12 en `CONTEXT.md`.
> Supersede v0.2 (estrategia v1=Luma). ADRs: ADR-001 (datos), ADR-002 (QR dual).

---

## Problem Statement

Organizamos eventos de comunidad gratuitos (primer caso: lanzamiento HACK IA, ~50 asistentes).
No tenemos forma **propia** de: registrar asistentes con un formulario nuestro, **curarlos**
(aprobar a mano), generar **badge personalizado** (foto + QR + branding), hacer **check-in**
por QR en puerta, y dar al asistente una **imagen para redes**.

Luma free no cubre badge con foto ni imagen social; su API exige Luma Plus (pago). Crafter
resolvió el badge pero **delegando registro/admin a Luma** (lock-in + costo). Queremos un
sistema **propio, $0, desacoplado y multi-evento** desde el día 1.

## Solution

App web (Next.js) **inhouse**, gratis, donde:

1. El público ve una **página del evento** (organizador, fecha, lugar, descripción).
2. Se **registra** con un formulario propio de **campos configurables por evento**
   (core: nombre, apellido, email; extras: teléfono, empresa, cargo, DNI, RUC).
3. Queda **pendiente de aprobación**. Un **admin** (único rol con login) **aprueba/rechaza** a mano.
4. Al aprobar → **email automático (Resend)** con la **URL del badge**.
5. El invitado abre la URL (magic link, sin cuenta), **sube su foto (obligatoria)** y consiente
   el uso de datos (Ley 29733, ADR-001).
6. El sistema genera dos salidas:
   - **Badge de entrada**: foto + nombre/apellido + cargo + **QR propio** + brand HACK IA. Privado.
   - **Imagen social**: foto + brand + mensaje *"Asistiré al lanzamiento de la comunidad HACK IA"*,
     **sin QR**, descargable/compartible.
7. El día del evento, un **admin escanea el QR con la cámara del celular** (`/scan`):
   marca asistencia, muestra ficha (foto+nombre+cargo), rechaza duplicado/inválido/no-aprobado.

Desacople: la UI nunca toca Supabase directo; pasa por una **API interna** por `event_id`
(reusable en otro evento). El registro vive detrás de `RegistroProvider`
(`InhouseProvider` Supabase = principal; `LumaProvider` CSV = seed/plan B).

## User Stories

**Asistente (sin cuenta)**
1. Como asistente, veo la página del evento (organizador, fecha, lugar) para decidir si voy.
2. Como asistente, me registro con un formulario con los campos que el evento pide, para solicitar lugar.
3. Como asistente, al registrarme veo un mensaje de "pendiente de aprobación", para saber el estado.
4. Como asistente aprobado, recibo un email con la URL de mi badge, para continuar.
5. Como asistente, abro la URL sin crear cuenta (magic link), para no fricción.
6. Como asistente, subo mi foto (obligatoria) y acepto el uso de mis datos, para generar mi badge.
7. Como asistente, veo mi badge de entrada con mi QR, para usarlo en la puerta.
8. Como asistente, descargo una imagen social con mi foto y el mensaje del evento, para postearla.
9. Como asistente, NO puedo compartir/descargar mi QR de entrada, para no filtrar mi acceso.
10. Como asistente, en la puerta muestro mi QR y entro rápido.

**Admin (con login)**
11. Como admin, inicio sesión, para acceder al panel y al scanner.
12. Como admin, configuro los campos del formulario del evento (cuáles pide y cuáles son obligatorios).
13. Como admin, veo la lista de registrados por evento, para curar.
14. Como admin, apruebo o rechazo cada registro a mano, para controlar quién entra.
15. Como admin, al aprobar se dispara el email con la URL del badge, sin trabajo manual extra.
16. Como admin, importo una vez el CSV de Luma como semilla, para no re-tipear a los ya inscritos.
17. Como admin, escaneo el QR con la cámara de mi celular en la puerta, para marcar asistencia.
18. Como admin, al escanear veo la foto/nombre/cargo del invitado, para confirmar identidad.
19. Como admin, el sistema rechaza un QR ya usado, inválido o de no-aprobado, para evitar fraude.
20. Como admin, creo un nuevo evento con su branding y campos sin tocar código, para reusar la plataforma.

## Implementation Decisions

**Arquitectura (desacople, P7):**
```
UI (Next.js) → API interna (route handlers, por event_id) → RegistroProvider / BadgeService / CheckinService → Supabase
```
- UI NUNCA llama Supabase directo. La lista sale de la API interna.
- `RegistroProvider` (puerto): `InhouseProvider` (Supabase, principal) + `LumaProvider` (CSV, seed/plan B). C3.

**Auth (P3):** solo **admins** tienen sesión (Supabase Auth, varios admins). Invitados sin cuenta → magic link.

**Registro/aprobación (P1, P2, P10):** form propio; campos en `events.form_fields` (jsonb)
`{key,label,tipo,obligatorio}`; aprobación **manual siempre**, **sin cupo/waitlist** (P7).

**Schema (multi-evento, ADR-002 QR dual):**
```
events ( id, slug unique, name, date, location, description, organizer,
         brand jsonb, form_fields jsonb, created_at )
guests ( id, event_id fk, name, last_name, email, role, company, phone, dni, ruc,
         photo_url, badge_url, social_url,
         status,                 -- registered|approved|badge_ready|checked_in|rejected|canceled
         magic_token unique,     -- página de foto/badge (invitado, sin cuenta)
         qr_token unique,        -- QR propio inhouse, ≠ id (rama B)
         qr_url,                 -- QR de Luma (rama A, seed)
         external_id,            -- guest_id de Luma (seed)
         consent_at, consent_version,   -- ADR-001
         created_at, approved_at, checked_in_at )
```
State machine: `registered →(admin aprueba) approved →(sube foto) badge_ready →(scan) checked_in`; `rejected`/`canceled` de salida.

**Badge (satori, dos salidas, P8/P9):** `BadgeService({name,last_name,role,photo,qr,brand}) → PNG`.
- Entrada: foto+datos+**QR propio** (de `qr_token`, → `/r/{qr_token}`). bg canvas `#0c0c14` exacto, Space Grotesk Bold.
- Social: foto+brand+mensaje exacto, **sin QR**.

**QR (ADR-002):** rama A `qr_url` Luma (seed) · rama B `qr_token` propio escaneable. Badge inhouse usa rama B.

**Check-in (P6):** `/scan` web, cámara del celu (`getUserMedia` + `@zxing/browser`), online, sesión admin.
`CheckinService(qr_token) → checked_in | {error: usado|invalido|no_aprobado}`. Dedupe.

**Email (P11):** Resend + React Email. Email auto al aprobar (URL badge). WhatsApp `wa.me` manual opcional.

**Validación:** `zod` (form, DNI 8 díg, RUC 11 díg). Env tipado `@t3-oss/env-nextjs`.

**Stack (P12, $0):** Next.js 16 + React 19 + TS + Tailwind 4 + shadcn · Supabase (DB+Storage+Auth) +
@supabase/supabase-js (sin ORM) · satori · qrcode · @zxing/browser · Resend · zod · Vercel Hobby (no-comercial).

## Testing Decisions

- **Buen test = comportamiento externo, no implementación.** Verificable por comando (curl/SQL/QR-decode/pixel).
- **Seam principal (1):** la **capa de servicios/API interna**. Tests pegan a `RegistroProvider`,
  `BadgeService`, `CheckinService` y a los route handlers (HTTP), no a clicks de UI ni a Supabase directo.
- Módulos testeados:
  - `RegistroProvider`: import CSV seed → count; register → pending; approve → dispara email (mock Resend).
  - state machine: transición válida pasa, salto lanza error.
  - `BadgeService`: PNG válido, pixel esquina `#0c0c14`, fuente cargada; QR del badge decodifica a `/r/{qr_token}`; QR ≠ guest_id.
  - `CheckinService`: marca checked_in; rechaza duplicado/inválido/no-aprobado.
- Smoke e2e (< 2 min): registro → aprobación → email → foto → badge → scan.
- Pruebas **por partes**: cada servicio/issue trae su test funcional (red→green), AC por capa (D/A/U/T/S/X, ver CAPAS.md).

## Out of Scope

**v1:** certificado PDF (v2) · WhatsApp automático/Kapso (v2) · badge en **video**/ffmpeg (v2) ·
badge generado con IA (no aplica) · portal multi-evento navegable para usuarios (P4) ·
cupo/waitlist (P7) · check-in offline (asume wifi) · form-builder UI drag-drop (JSON basta).

**Siempre fuera:** ponentes/speakers · pagos/tickets pagos · app nativa/kiosko de impresión ·
multi-tenant para terceros (solo multi-evento nuestro) · reverse-engineer API de Luma (ToS).

## Further Notes

- Evento de prueba: **Test1** (22 jul, Pacífico Seguros, San Isidro). Seed = `Luma_test/Test1*.csv` (3 inscritos).
- No-comercial → Vercel Hobby $0. Si klipso monetiza (cobra/ads) → comercial → Vercel Pro $20 o host alterno.
- Pendiente no bloqueante: TLD de klipso para DNS de `send.klipso.xxx` (Resend).
