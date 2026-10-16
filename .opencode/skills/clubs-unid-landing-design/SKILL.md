---
name: clubs-unid-landing-design
description: Use when designing or implementing the Clubs UNID public landing (/conoce-clubs), marketing-style public pages, or when applying Clubs UNID visual identity (theme colors, cards, CTAs). Triggers: landing, Clubs UNID Campeche, conoce-clubs, diseño de interfaz pública, hero, propuestas de clubes.
---

# Clubs UNID — Diseño de landing

Guía de diseño para la landing pública y pantallas de presentación. No sustituye a `DESIGN.md`: léelo antes de tocar la interfaz.

## Antes de escribir UI

1. Lee `DESIGN.md` (identidad, paleta, tipografía, componentes, breakpoints).
2. Lee `AGENTS.md` secciones 7–11 (diseño y landing).
3. Reutiliza `src/config/landing.js` para copy editable y el slug de encuesta.
4. No inventes rutas, clubes aprobados, horarios ni fotos de campus.

## Identidad verificada

| Uso | Regla |
|-----|--------|
| Fondo app oscuro | `#0b111e` (`tema.bg`) |
| Superficie card | `tema.cardCls` o `#0e162c` / white |
| Acento / CTA primario | `bg-amber-400 text-[#0e162c]` |
| Contenedor público | `px-6 sm:px-8 lg:px-12 xl:px-16` |
| Secciones | `py-12 sm:py-16` + `border-t` con `tema.headerBorder` |
| Radio de tarjeta | `rounded-xl` / `rounded-2xl` (verificado en `TarjetaClub`) |
| Títulos | `font-black tracking-tight` + `tema.title` |
| Badges de categoría | `clasesBadge` de `src/constants/colores.js` |
| Iconos | Componente `Icono` (sin librerías nuevas) |

## Encuesta

- El destino real sale de `ENCUESTA_SLUG` en `src/config/landing.js`.
- Mientras sea `null`: CTA atenuado, sin `href`/`to` a `#` ni rutas inventadas; texto honesto de preparación.
- Siempre dejar CTA accesible desde el inicio y el final de la landing.
- Aclarar que responder ≠ inscribirse ni garantiza apertura de club.
- No prometer anonimato ni duración sin verificar el texto vivo de la encuesta.

## Composición esperada (landing)

1. Presentación + CTAs explorar / encuesta.
2. Qué es un club (lenguaje simple + ejemplos).
3. Propuestas desde la API pública de clubes, con estados honestos (catálogo vs propuesta).
4. Propósito de la encuesta + aclaración.
5. Equipo: Ángel Pecero, Jorge Martínez, Gustavo Gallegos (sin cargos inventados).

## Fuera de alcance

- No refactorices el sistema de temas completo.
- No cambies autenticación, permisos ni el módulo de encuestas.
- No dupliques la landing en otra ruta.
