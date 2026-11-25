# Reacciones del lobo · ClubsUNID

Colección de diseño v1.1, creada el 25 de noviembre de 2026. Contiene **28 expresiones** con la silueta angular, los colores dorados y el contorno morado del lobo de ClubsUNID.

Las tres originales —Me gusta, Me encanta y Aplausos— se conservan como referencia. Las **25 variantes nuevas están en reserva**: este directorio no está conectado con las rutas, los botones ni la base de datos de la aplicación.

## Consultar y descargar

- Abrir `index.html` en un navegador. Funciona sin conexión ni instalación.
- Filtrar por familia o buscar por emoción. Tocar un lobo para ampliarlo, repetir su gesto y verlo a 48, 96 o 160 píxeles de ancho.
- Cambiar el fondo para comprobar cada expresión sobre claro y oscuro.
- Descargar cada SVG desde su tarjeta; la vista ampliada ofrece también el PNG.
- `vista-general.png` y `vista-general.svg` reúnen las 28 expresiones en una sola lámina de siete columnas y cuatro filas.

## Archivos

| Archivo o carpeta | Contenido |
| --- | --- |
| `svg/` | 28 ilustraciones vectoriales estáticas, editables y con fondo transparente. |
| `png/` | Las mismas 28 ilustraciones con fondo transparente, a 768 × 800 píxeles. |
| `index.html` | Galería con filtros, búsqueda, gestos, tamaños y fondos claro y oscuro. |
| `manifest.json` | Nombres, identificadores, familias, estado y rutas de cada expresión. |
| `animaciones.css` | Gestos breves; respeta la preferencia de movimiento reducido. |
| `fuente/` | Trazos, datos, estilos y generador para ampliar la colección. |

Los SVG y PNG individuales son estáticos. Los gestos se prueban en la galería. Para reutilizar en el futuro los SVG animados, la clase `lobo-reaccion--animado` y `animaciones.css` activan un gesto sobre el SVG insertado en línea. Los tres tipos originales conservan `like`, `love` y `clap`; los otros identificadores son exclusivos de esta biblioteca.

## Colección

| Familia | Expresiones |
| --- | --- |
| Originales | Me gusta, Me encanta, Aplausos. |
| Alegría | Feliz, Me divierte, Guiño, Genial, Celebración, Orgullo, Inspirado, ¡Ánimo!, Travieso. |
| Cariño | Abrazo, Gracias, Besito, Timidez, Alivio, Saludo. |
| Matices | Sorpresa, Pensando, Curiosidad, Confusión, Tristeza, Llanto, Enojo, Preocupación, Sueño, Enfermito. |

La ampliación v1.1 añade Saludo (25), ¡Ánimo! (26), Enfermito (27) y Travieso (28). Conserva los identificadores y los archivos de las 24 expresiones anteriores.

## Mantener la colección

La base gráfica procede de `src/components/actividades/LoboReaccion.jsx`. Los originales de la aplicación no se modifican al editar esta colección.

Editar `fuente/coleccion.mjs` para añadir gestos o expresiones; `fuente/galeria.css` y `fuente/galeria.js` controlan la presentación. Desde este directorio, ejecutar:

```sh
node fuente/generar.mjs
```

Esto regenera los SVG, la galería, la lámina vectorial, el manifiesto y los estilos de animación. Si `sharp` está disponible, `node fuente/generar.mjs --png` regenera también los PNG. Abrir o utilizar los archivos ya exportados no requiere Node ni dependencias.

Antes de habilitar nuevas reacciones en el producto, habrá que decidir cuáles se usarán y adaptar expresamente la interfaz y los valores admitidos por el servidor.
