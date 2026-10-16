---
name: clubs-unid-ui-review
description: Use when reviewing Clubs UNID UI changes (landing, public pages, shared components) against DESIGN.md and AGENTS.md before delivery. Triggers: revisar interfaz, UI review, check landing, revisión de diseño, accesibilidad de la landing, verificación de estilos.
---

# Clubs UNID — Revisión de UI

Checklist para revisar interfaces nuevas o modificadas. Es revisión de **código y convenciones**; no afirmes verificación visual si no hay navegador/capturas.

## Antes de revisar

1. `DESIGN.md` — tokens, componentes, inconsistencias ya conocidas.
2. `AGENTS.md` — criterios de landing y verificación proporcional.
3. Archivos tocados en el diff (no refactorices ajenos al alcance).

## Checklist

### Identidad
- [ ] Colores de `ThemeContext` / pares oscuro-claro existentes; no hex nuevos sin justificación.
- [ ] Acento ámbar solo en acciones y énfasis coherentes.
- [ ] Contenedores y radios alineados a `DESIGN.md` (no convertir inconsistencias globales en refactor masivo).
- [ ] Iconos vía componente `Icono`.

### Landing (si aplica)
- [ ] Ruta pública sin sesión; no debilita rutas protegidas.
- [ ] CTAs de encuesta: destino real o estado honesto (sin `#` inventado).
- [ ] Propuestas no presentadas como clubes aprobados.
- [ ] Equipo correcto, sin cargos inventados.
- [ ] Aclaración responder ≠ inscribirse.
- [ ] Copy editable en `src/config/landing.js` cuando corresponda.

### Accesibilidad y móvil
- [ ] Encabezados en orden (h1 → h2 → h3).
- [ ] Texto alternativo pertinente; imágenes decorativas `alt=""` + `aria-hidden`.
- [ ] Estados de carga / vacío / error.
- [ ] Foco visible en acciones nuevas.
- [ ] `prefers-reduced-motion` si hay animaciones CSS nuevas.
- [ ] Sin depender de hover solo en móvil; targets táctiles razonables.

### Calidad
- [ ] `pnpm lint` y `pnpm build` si se tocó código.
- [ ] Distingue en el reporte: revisión de código vs pruebas vs visual.
- [ ] No inventes el resultado de checks no ejecutados.

## Salida esperada

Informe breve con: qué se revisó, hallazgos (bloqueantes / menores), qué se corrigió en el alcance y qué queda reportado fuera de alcance.
