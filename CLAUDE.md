# CLAUDE.md — Plataforma de Eventos (eventos_v1)

Guía para Claude Code en este repo. Hereda las reglas globales de `~/.claude/`.
Local manda sobre global donde haya conflicto.

## Qué es

App web propia para gestionar eventos de comunidad: registro → curación →
magic link → badge (foto+QR) → check-in → certificado. $0/mínimo costo,
desacoplada, **escalable a múltiples eventos** (`event_id` desde el día 1).

- PRD: `docs/prds/PRD-event-platform.md`
- Journey/timeline: `README.md` (gráficos mermaid)
- Research/repos: `RESEARCH.md`
- Estados detallados: `JOURNEY.md`

## Stack

- **Next.js 16 + React 19 + TypeScript + Tailwind 4**
- **shadcn/ui** para componentes
- **Supabase**: Postgres (DB) + Storage (fotos) + Auth (login admin)
- **@supabase/supabase-js** (sin ORM) + migraciones SQL en `supabase/migrations/` + `supabase gen types`
- **satori + @vercel/og** → badge PNG
- **qrcode** → QR de check-in (token único, NUNCA el guest_id)
- **pdf-lib / react-pdf** → certificado PDF
- **Resend + React Email** → email (requiere dominio verificado)
- **Trigger.dev** → jobs async (batch badges) — opcional
- **Vercel** → deploy

> Decisión clave: NO replicar a crafter (Neon + Vercel Blob + Luma API de pago).
> Supabase junta DB+Storage+magic-link gratis. Menos piezas, menos plazo.

## Comandos

```bash
pnpm dev            # dev server
pnpm build          # build prod
pnpm db:migrate     # aplica migraciones SQL (supabase/migrations)
pnpm lint           # biome check
```

## Convenciones

- TypeScript estricto. NUNCA `any` (usar tipos, `unknown`, generics).
- Server Components por defecto. `'use client'` solo si hay interactividad.
- Componentes PascalCase, hooks `useX` camelCase.
- Imports: externos → internos → relativos.
- Funciones < 50 líneas; extraer helper si crece.
- Secrets en `.env` + `.env.example` (sin valores reales). NUNCA commitear secrets.

## Reglas de dominio (no romper)

- **Multi-evento**: toda query de guests filtra por `event_id`. Nunca global.
- **qr_token ≠ guest_id**: el QR lleva un token aleatorio; check-in valida server-side.
- **magic_token**: un token por invitado, reusado para upload-foto y descarga-badge.
- **State machine de `status`**: solo transiciones válidas (ver PRD §5). No saltar estados.
- **Ponentes/speakers = OUT OF SCOPE.** No agregar lógica de speakers.

## Definition of Done

DONE = **demo verificable con datos reales**, no "código escrito".
- Smoke test pasa (app levanta, registro inserta, magic link abre, badge genera).
- Check-in rechaza token duplicado/ajeno.
- Sin secrets en el diff. Sin `any`. Lint limpio.

## Smoke test (core, < 2 min)

1. App levanta sin crashear.
2. Registro inserta fila `guests` con `status=registered`.
3. Aprobar en dashboard → manda magic link (log Resend OK).
4. Magic link abre página, sube foto, genera badge PNG.
5. `/checkin/{qr_token}` marca `checked_in`, rechaza repetido.

## Skills a usar (instaladas en klipso_web / global)

- `/grill-with-docs` → `/to-prd` → `/to-issues` → `/tdd` (workflow mattpocock)
- UX/UI: `ui-styling` (shadcn+tailwind), `design-system` (tokens), `brand` (branding badge)
- `/prototype` para explorar UI del badge antes de comprometer
