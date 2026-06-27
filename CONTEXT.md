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

## Marca — HACK IA (paleta del logo)

Logo en `Logo/hackia_primary_dark.svg` (+ `.png`). Paleta extraída del SVG:

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0c0c14` | fondo del badge (negro azulado — NO `#000000`) |
| `primary` | `#6f5ff2` | violeta — borde, rol, acento |
| `secondary` | `#00cfaa` | turquesa — QR/detalle |
| `text` | `#e8e8f0` | nombre/rol (casi blanco) |
| `qr_bg` | `#FFFFFF` | cuadro blanco bajo el QR (escaneable) |

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
