# ADR-001 — Manejo de datos personales (foto)

- Estado: Aceptada
- Fecha: 2026-06-27
- Decisión difícil de revertir (toca legal + schema + UX)

## Contexto

El flujo captura **foto** del asistente para el badge. En Perú, foto = **dato personal**
bajo la **Ley N° 29733 (Protección de Datos Personales)** y su reglamento, supervisada
por la Autoridad Nacional de Protección de Datos Personales (ANPD). El usuario pidió
explícitamente "seguir la ley de datos".

## Decisión

1. **Consentimiento explícito** en el registro: checkbox obligatorio (no pre-marcado)
   con enlace a un **aviso de privacidad** que declara:
   - Finalidad: generar badge y gestionar acceso al evento.
   - Quién trata los datos y por cuánto tiempo.
   - Derechos ARCO (acceso, rectificación, cancelación, oposición) + cómo ejercerlos.
2. **Minimización**: solo se pide lo necesario (nombre, email, rol, foto).
3. **Plazo de borrado**: las fotos se eliminan **30 días después del evento**
   (job/manual). Datos de contacto se conservan solo si hay consentimiento aparte.
4. **Seguridad**: fotos en Supabase Storage con bucket privado + URLs firmadas; acceso
   restringido por `magic_token` / rol admin.
5. **Trazabilidad**: guardar `consent_at` (timestamp) y versión del aviso aceptado.

## Consecuencias

- Schema `guests` suma: `consent_at`, `consent_version`, política de borrado de `photo_url`.
- UX de registro suma checkbox + link a aviso de privacidad.
- Necesario redactar el **aviso de privacidad** (texto legal) antes de ir a producción.
- Pendiente verificar si el volumen obliga a inscribir el banco de datos ante la ANPD.
