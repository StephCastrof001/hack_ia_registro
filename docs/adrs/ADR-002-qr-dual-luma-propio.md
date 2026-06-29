# ADR-002 — Estrategia de QR dual: Luma (v1) + propio (v2)

Estado: aceptado · Fecha: 2026-06-28 · Decide: Stephanie
Relacionado: ADR-001 (datos), PRD §2 (puerto RegistroProvider)

## Contexto

El export de Luma free (`Luma_test/*.csv`) ya trae una columna `qr_code_url` por
invitado, ej:

```
https://luma.com/check-in/evt-wzlK674uYh7A5SL?pk=g-OdbgH0lXbZjbuZN
```

Mismo `pk` que el ticket link del invitado → es el **QR de check-in de Luma, único
por persona**. Luma ejecuta el check-in escaneando ese QR. No necesita Luma Plus ni API.

## Decisión

Mantener **dos ramas de QR en paralelo**, ambas escaneables:

### Rama A — QR de Luma (v1, ACTIVO)
- El badge embebe el `qr_code_url` provisto por Luma.
- Escanear el badge → abre la página de check-in de Luma.
- Check-in en v1 = **100% Luma**. No construimos `/checkin` propio para producción v1.

### Rama B — QR propio de registro/check-in (explorar, v2)
- Generamos un `qr_token` propio (CSPRNG, único, ≠ `guest_id`).
- QR propio escaneable → apunta a `/r/{qr_token}` (registro/check-in inhouse).
- Debe pasar test de decodificación real (no solo "se ve un QR").
- Vive detrás de `RegistroProvider`: el día que Luma salga (v2), el badge cambia
  de fuente de QR sin tocar el resto (criterio C3).

## Consecuencias

- `guests` guarda **ambos**: `qr_url` (Luma, rama A) + `qr_token` (propio, rama B).
- El generador de badge recibe el QR como dato (`{qr}`), no sabe de qué rama viene.
  Default v1 = `qr_url` de Luma.
- `/checkin` propio NO es scope de producción v1, pero la rama B se mantiene viva
  como capacidad escaneable (spike), no se borra.
- Regla original "qr_token ≠ guest_id" sigue válida para la rama B.

## Alternativas descartadas

- **Solo QR propio (PRD original):** duplica el check-in que Luma ya hace gratis. Más trabajo, sin valor en v1.
- **Solo QR Luma, borrar rama propia:** perdería el camino de swap a inhouse (v2). Lock-in a Luma.
- **Reverse-engineer API de Luma:** viola ToS, frágil, ROI negativo. Descartado.
