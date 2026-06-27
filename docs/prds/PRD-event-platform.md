# PRD — Plataforma de Eventos (registro → badge → check-in → certificado)

> Formato estilo `/to-prd` (mattpocock). Sintetiza la conversación previa. No re-entrevista.
> Estado: v0.1 · Fecha: 2026-06-27 · Owner: Stephanie

---

## 1. Problem statement

Organizamos eventos de comunidad (primer caso: ~50 asistentes). Hoy no tenemos forma
propia de: registrar asistentes, **curarlos** (aprobar a mano), generar **badges
personalizados** (foto + QR + branding), hacer **check-in** por QR, y emitir
**certificados** post-evento. Luma free no cubre badge con foto, WhatsApp, ni
certificados; la API de Luma exige Luma Plus (pago) que no queremos.

Necesitamos un sistema **propio, $0/mínimo costo, desacoplado y escalable a múltiples
eventos**, que arranque con 1 evento.

## 2. Solución (resumen)

App web (Next.js) con flujo self-service por **magic link**:

1. Asistente se **registra** (datos básicos, sin foto).
2. Organizador **aprueba** a mano (curación). Sin cupo → **waitlist**.
3. Aprobado recibe **mail con magic link**.
4. Link abre página con datos precargados → **sube foto**.
5. Sistema genera **QR + badge** → descarga + mail.
6. **Recordatorio** D-2 / día.
7. **Check-in** escaneando QR en puerta (valida token único, no duplicado).
8. **Certificado PDF** post-evento a quien asistió.

Desacople: el generador de badge/certificado recibe `{nombre, rol, foto, qr, brand}` y
no conoce el origen del registro. Multi-evento via `event_id` en el schema desde el día 1.

## 3. Métrica de éxito (DoD del producto)

- ✅ 50 asistentes registrados, curados y con badge entregado **sin trabajo manual por persona**.
- ✅ Check-in de un asistente en **< 5 segundos** por QR.
- ✅ Agregar un **segundo evento** = crear 1 fila `events` + brand, **cero cambios de código**.
- ✅ Costo de infraestructura **$0** en el primer evento.

## 4. User stories (numeradas)

**Asistente**
- US-1: Como asistente, me registro con nombre/email/rol para pedir lugar.
- US-2: Como asistente aprobado, recibo un magic link para completar mi perfil.
- US-3: Como asistente, subo mi foto y obtengo mi badge con QR.
- US-4: Como asistente, descargo mi badge y lo recibo por email/WhatsApp.
- US-5: Como asistente, en la puerta muestro mi QR y entro rápido.
- US-6: Como asistente que asistió, recibo mi certificado PDF.

**Organizador**
- US-7: Como organizador, veo la lista de registrados y apruebo/rechazo a mano.
- US-8: Como organizador, si no hay cupo mando a waitlist y libero al cancelar alguien.
- US-9: Como organizador, escaneo QR en la puerta y marco asistencia.
- US-10: Como organizador, veo métricas (registrados, confirmados, check-in, no-show).
- US-11: Como organizador, creo un nuevo evento con su branding sin tocar código.

## 5. Decisiones de implementación (stack)

| Capa | Decisión | Por qué (vs crafter) |
|---|---|---|
| Framework | **Next.js 16 + React 19 + TS + Tailwind 4** | igual a crafter, moderno |
| UI | **shadcn/ui** (skill `ui-styling`) | acelera, accesible |
| DB | **Supabase Postgres** + **Drizzle ORM** | crafter usa Neon; Supabase suma Storage+Auth |
| Storage foto | **Supabase Storage** | crafter usa Vercel Blob; 1 proveedor menos |
| Auth / magic link | **Supabase Auth** (magic link nativo) | crafter lo hace a mano; aquí es gratis |
| Badge | **satori + @vercel/og** → PNG | crafter usa sharp/AI; satori basta para estático |
| QR | **qrcode** (token único, no guest_id) | seguridad check-in |
| Certificado | **pdf-lib / react-pdf** → PDF | no existe en crafter |
| Email | **Resend** + **React Email** (plantillas) | igual a crafter |
| Jobs async | **Trigger.dev** (opcional, batch badges) | igual a crafter |
| WhatsApp | **wa.me** (manual) → Kapso/Twilio (futuro pago) | crafter usa Kapso |
| Deploy | **Vercel** free | — |
| Dominio | **tuevento.com** (verificar DNS en Resend) | necesario para email no-spam |

### Schema (multi-evento desde día 1)

```
events (
  id uuid pk, slug text unique, name text, date timestamptz,
  location text, capacity int, brand jsonb,  -- {logo_url, color_primary, color_bg}
  created_at timestamptz
)

guests (
  id uuid pk, event_id uuid fk -> events,
  name text, email text, role text, company text, phone text,
  photo_url text, badge_url text,
  status text,                 -- enum abajo
  magic_token text unique,     -- para link self-service
  qr_token text unique,        -- para check-in (distinto del id)
  consent_at timestamptz,      -- ADR-001 ley 29733
  consent_version text,        -- aviso de privacidad aceptado
  created_at, confirmed_at, checked_in_at timestamptz
)

status enum:
  registered -> confirmed -> photo_pending -> badge_ready -> checked_in -> no_show
  (+ waitlisted, rejected, canceled)
```

### Decisiones del grill (2026-06-27) — ver CONTEXT.md + ADR-001

- D1 Aprobación **mixta**: auto si hay cupo + expulsión manual posible.
- D2 Foto **obligatoria** (bloquea `badge_ready`).
- D3 **Una sola** plantilla de badge.
- D4 Certificado a **todos los confirmados** (no exige check-in → cert puede generarse al confirmar).
- D5 Check-in: staff con celular, escaneo QR, **online** (sin modo offline).
- D7 Datos: **Ley 29733** → consent + borrado de fotos a 30 días (ADR-001).
- D8 Recordatorio **manual** (botón). D9 Waitlist **promoción manual**.

## 6. Decisiones de testing

- Smoke test: app levanta, registro inserta fila, magic link abre, badge se genera.
- Unit: state machine de `status` (transiciones válidas), `qr_token` único e irrepetible.
- Integración: registro → aprobación → mail → upload → badge → check-in (happy path).
- Check-in: rechaza token duplicado / inexistente / de otro evento.

## 7. Out of scope (v0.1)

- ❌ **Ponentes/speakers** — flujo distinto, lo maneja otra área. NO contemplar.
- ❌ Pagos / tickets pagos.
- ❌ App nativa / kiosk de impresión física.
- ❌ Multi-tenant para terceros (solo multi-evento nuestro por ahora).
- ❌ WhatsApp automático (v0.1 = wa.me manual).

## 8. Módulos a tocar

- `db/` — schema events + guests (Drizzle)
- `app/(public)/register` — form registro
- `app/(public)/badge/[magic_token]` — upload foto + ver/descargar badge
- `app/(public)/checkin/[qr_token]` — marcar asistencia
- `app/(admin)/dashboard` — curación, aprobar/rechazar/waitlist, métricas
- `app/api/og/badge` — gen badge (satori)
- `lib/cert` — gen certificado (pdf-lib)
- `lib/email` — Resend + React Email
- `lib/jobs` — Trigger.dev (batch)

## 9. Repos de apoyo (discovery)

- `crafter-station/vibecode-fest-badges` — capa badge (sharp/AI), Trigger.dev, Resend, Kapso. **Usa Neon + Vercel Blob + Luma API (NO Supabase).**
- `zhravan/rsvp2go` — esquema RSVP mínimo edge.
- `HiEventsDev/Hi.Events` — data model completo (solo leer).
- `gath.io` — RSVP simple por email.
