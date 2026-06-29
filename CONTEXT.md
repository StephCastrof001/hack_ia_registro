# CONTEXT.md — Dominio del proyecto (eventos_v1)

Glosario de dominio + decisiones resueltas. Generado por grill (estilo `/grill-with-docs`).
Cualquier agente lee esto antes de tocar código. Fecha: 2026-06-27.

---

## Glosario (lenguaje ubicuo)

- **Asistente** — persona que va al evento como público. (Ponentes = OTRA cosa, out of scope.)
- **Registro** — el asistente llena el form con datos básicos. NO incluye foto.
- **Curación** — el organizador revisa/decide quién entra. Aquí es **mixto**: auto-aprueba
  si hay cupo, pero el organizador puede rechazar/expulsar después.
- **Magic link** — URL única con token, sin contraseña, que se manda al asistente aprobado.
  Único camino para subir foto y descargar badge. Reutiliza un solo `magic_token` por invitado.
- **Foto** — imagen del asistente, **obligatoria**. Sin foto no hay badge. Es dato personal (ver ADR-001).
- **Badge** — credencial PNG con foto + nombre + rol + QR. **Una sola plantilla** para todos.
- **qr_token** — token aleatorio único por invitado, embebido en el QR. Distinto del `id`.
  Escanearlo = autorizar check-in server-side.
- **Check-in** — staff escanea el QR con su celular (página admin), marca asistencia.
  **Online** (asume wifi/datos en puerta). No requiere modo offline.
- **Certificado** — PDF de participación. Se emite a **todos los confirmados** (NO exige
  haber hecho check-in). Puede generarse al confirmar.
- **Waitlist** — lista de espera cuando se llena el cupo. Promoción **manual** (organizador elige).
- **Recordatorio** — email que el organizador dispara **manual** (botón), no cron.
- **Admin** — persona con **sesión** (login Supabase Auth). Configura el evento, aprueba/rechaza,
  escanea en puerta. Puede haber **varios admins**. Único rol con cuenta.
- **Invitado** — asistente. **NO tiene cuenta ni sesión.** Interactúa solo por **magic link**
  enviado por mail/WhatsApp. No puede navegar otros eventos (NO es portal tipo Luma).
- **Staff scanner** — usa una **sesión admin** para abrir `/scan` y leer QR con la cámara del celu.
- **Seed import** — importación **única** del CSV de Luma como semilla (los ya inscritos).
  Tras el seed, el registro vivo es el **formulario propio** (inhouse). Luma = referencia/plan B.
- **Form fields** — campos del formulario de registro, definidos **por evento** en `events.form_fields`
  (jsonb): `{key,label,tipo,obligatorio}`. Core fijo: nombre, apellido, email. Extras
  (teléfono/empresa/cargo/DNI/RUC) con obligatoriedad configurable por evento. Sin UI form-builder.

## Estados del asistente (state machine)

```
registered ──(auto si cupo)──> confirmed ──> photo_pending ──(sube foto)──> badge_ready
   │                                                                            │
   └──(sin cupo)──> waitlisted ──(promoción manual)──> confirmed                ├──> checked_in
                                                                                └──> (certificado: a todo confirmed)
estados de salida: rejected (expulsión manual), canceled (se baja)
```

> Nota: como el certificado va a todo `confirmed`, el check-in NO gatea nada del cert.
> Check-in sirve para control de puerta + métrica de asistencia / no-show.

## Decisiones resueltas (grill 2026-06-27)

| # | Decisión | Valor |
|---|---|---|
| D1 | Aprobación | Mixto (auto con cupo + expulsión manual) |
| D2 | Foto | Obligatoria (bloquea badge) |
| D3 | Plantilla badge | Una sola |
| D4 | Certificado | Todos los confirmados |
| D5 | Check-in | Staff con celular, escaneo QR, **online** |
| D6 | Offline en puerta | No requerido |
| D7 | Datos personales | Cumplir Ley 29733 (ver ADR-001) |
| D8 | Recordatorios | Manual (botón) |
| D9 | Waitlist | Promoción manual |

## Decisiones del pivote (grill 2026-06-28) — v0.3 inhouse

| # | Decisión | Valor |
|---|---|---|
| P1 | Registro vivo | **Inhouse** (form propio). Luma = **seed** único + plan B detrás del puerto |
| P2 | Campos del form | **JSON por evento** (`events.form_fields`), obligatoriedad configurable. Core: nombre, apellido, email |
| P3 | Auth/sesiones | **Solo admins** (varios). Invitados sin cuenta → magic link mail/WhatsApp |
| P4 | Portal multi-evento navegable | **No** (no es Luma). Cada evento link-driven |
| P5 | QR del badge | Rama dual (ADR-002): Luma (seed) + propio escaneable (inhouse) |
| P6 | Check-in scanner | **Cámara del celu** (web, getUserMedia + zxing), sesión admin, online |
| P7 | Desacople de datos | UI nunca toca Supabase directo → **API interna** por `event_id` (reusable multi-evento) |
| P8 | Mensaje del badge | exacto: **"Asistiré al lanzamiento de la comunidad HACK IA"** |
| P9 | Dos salidas visuales | **Badge entrada** (foto+datos+QR, solo para el invitado, SIN compartir) · **Imagen social** (foto+brand+mensaje, SIN QR, ÚNICA compartible) |
| P10 | Aprobación | **Manual siempre** (admin aprueba/rechaza c/u). Sin auto-cupo |
| P11 | Entrega del link | **Email auto (Resend)** en v1. WhatsApp `wa.me` manual ($0) opcional · Kapso (WhatsApp Business API, pago) = v2 |
| P12 | Stack/hosting | **Supabase** (DB+Storage+Auth) + Resend + **Vercel Hobby** ($0, no-comercial OK). +`zod` +`@t3-oss/env-nextjs` (de crafter). NO all-Vercel (Neon+Blob = más piezas, sin Auth). NO IA/Trigger/ffmpeg (caso de crafter, no el nuestro) |

> Nota: P1-P8 reemplazan la estrategia v1=Luma del 2026-06-27. Luma ya NO es el registro vivo;
> queda como `LumaProvider` (seed/plan B) detrás de `RegistroProvider`.

### State machine v0.3 (inhouse, simplificada)

```
registered ──(admin aprueba)──> approved ──(invitado sube foto)──> badge_ready ──(scan QR)──> checked_in
   │
   └──(admin rechaza)──> rejected          (canceled: el invitado se baja)
```

- **Sin** `waitlisted`/`confirmed`/cupo (P7: admin libre). **Sin** certificado (v2).
- Foto = gate entre `approved` y `badge_ready` (D2 sigue: foto obligatoria).
- `checked_in` = scan del QR por admin (dedupe: segundo scan rechazado).
- Validación form: DNI 8 díg, RUC 11 díg (formato, sin RENIEC/SUNAT).

## Marca — HACK IA (paleta del logo)

Logo en `Logo/hackia_primary_dark.svg` (+ `.png`). Paleta extraída del SVG:

| Token | Hex | Rol oficial | Uso |
|---|---|---|---|
| `bg` | `#0c0c14` | **Canvas** | fondo del badge (negro azulado — NO `#000000`) |
| `primary` | `#6f5ff2` | **Primario** | violeta — borde, rol, acento |
| `accent` | `#00cfaa` | **Acento** | turquesa — QR/detalle |
| `text` | `#e8e8f0` | **Texto** | nombre/rol (casi blanco) |
| `qr_bg` | `#FFFFFF` | — | cuadro blanco bajo el QR (escaneable) |

**Tipografía:** Space Grotesk Bold (Google Fonts, free).
→ satori EXIGE el archivo de fuente: descargar `.ttf`/`.woff` a `assets/fonts/` y pasarlo al render.

**Generador de imágenes de marca:** Flux Dev / Midjourney v6 (para fondos/social, NO para el badge).
El badge se genera con satori (texto+foto+QR exactos), no con IA.

> ⚠️ Badge bg = `#0c0c14` EXACTO para que el fondo del logo funda sin recuadro.
> Estos hex viven en `events.brand` (jsonb), no hardcoded → cumple C7.

## Estrategia de versiones (v1 simple → v2 desacoplada)

- **v1 (MVP con Luma):** Luma hace registro/aprobación/check-in. Construir SOLO:
  export de guests → generar badge → enviar. Validar rápido con mínimo build.
- **v2 (inhouse desacoplada):** registro/check-in propios (Supabase), Luma fuera.

**Puerto para swap barato (definir desde v1):**

```ts
interface RegistroProvider {
  getGuests(eventId: string): Promise<Guest[]>
  onApproved(guest: Guest): Promise<void>   // dispara magic link
}
// v1: LumaProvider implements RegistroProvider     (CSV/API Luma)
// v2: InhouseProvider implements RegistroProvider   (form propio + Supabase)
```

Badge/email/check-in dependen de `RegistroProvider`, NUNCA de Luma directo.
Swap v1→v2 = escribir `InhouseProvider`, cero cambios en el resto (criterio C3).

## Aún por definir (no bloqueante para v0.1)

- Capacidad exacta del primer evento (asumido 50).
- TLD del dominio (`klipso.???`) para hosts DNS.
- Contenido visual exacto del badge y del certificado.
- Cuántos admins / login del organizador.
