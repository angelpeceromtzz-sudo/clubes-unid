import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ANIMACIONES_CSS, REACCIONES, dibujarLobo, escapar } from './coleccion.mjs';

const raiz = new URL('../', import.meta.url);
const normalizarTexto = (texto) => texto.replace(/[\t ]+$/gm, '');
const grupos = ['Todas', 'Originales', 'Alegría', 'Cariño', 'Matices'];
const originales = REACCIONES.filter((reaccion) => reaccion.original).length;
const reserva = REACCIONES.length - originales;
const version = '1.1.0';
const versionCorta = version.split('.').slice(0, 2).join('.');
if (new Set(REACCIONES.map((reaccion) => reaccion.id)).size !== REACCIONES.length
  || new Set(REACCIONES.map((reaccion) => reaccion.archivo)).size !== REACCIONES.length) throw new Error('Hay identificadores o archivos duplicados.');

const iconos = {
  descargar: '<path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/>',
  luna: '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>',
  lamina: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  buscar: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  repetir: '<path d="M20 10a8 8 0 1 0-2 8M20 4v6h-6"/>',
  archivo: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8m-10 4h6"/>',
  cerrar: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icono = (nombre) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconos[nombre]}</svg>`;
const lobo = (tipo, prefijo) => dibujarLobo(REACCIONES.find((reaccion) => reaccion.id === tipo), { prefijo, decorativo: true });

function tarjeta(reaccion) {
  return `<article class="tarjeta" data-id="${reaccion.id}" data-nombre="${escapar(reaccion.nombre)}" data-grupo="${escapar(reaccion.grupo)}" data-original="${reaccion.original}" data-gesto="${escapar(reaccion.gesto)}" data-busqueda="${escapar(`${reaccion.nombre} ${reaccion.claves} ${reaccion.grupo} ${reaccion.id}`)}">
    <div class="tarjeta__cabecera"><span class="tarjeta__numero">${reaccion.numero}</span><span class="estado ${reaccion.original ? 'estado--original' : ''}">${reaccion.original ? 'Original' : 'En reserva'}</span></div>
    <button type="button" class="tarjeta__ver" aria-label="Ampliar ${escapar(reaccion.nombre)}"><span class="tarjeta__imagen">${dibujarLobo(reaccion, { prefijo: 'tarjeta-' + reaccion.id, decorativo: true })}</span></button>
    <div class="tarjeta__inferior"><div><h3>${escapar(reaccion.nombre)}</h3><p class="tarjeta__grupo">${escapar(reaccion.grupo)}</p></div><a class="descargar" href="svg/${reaccion.archivo}.svg" download="lobo-${reaccion.archivo}.svg" aria-label="Descargar SVG de ${escapar(reaccion.nombre)}" title="Descargar SVG">${icono('descargar')}</a></div>
  </article>`;
}

const [css, js] = await Promise.all([
  readFile(new URL('galeria.css', import.meta.url), 'utf8'),
  readFile(new URL('galeria.js', import.meta.url), 'utf8'),
]);

const html = `<!doctype html>
<html lang="es" data-tema="claro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" type="image/svg+xml" href="svg/me-gusta.svg">
  <meta name="description" content="Biblioteca de diseño con ${REACCIONES.length} expresiones del lobo de ClubsUNID. ${originales} originales y ${reserva} nuevas variantes en reserva.">
  <title>Reacciones del lobo · ClubsUNID</title>
  <style>${css}\n${ANIMACIONES_CSS}</style>
</head>
<body>
<div class="contenedor">
  <header class="cabecera">
    <div class="marca"><span class="marca__icono">${lobo('like', 'marca')}</span><div class="marca__nombre">CLUBSUNID<span class="marca__subtitulo">Biblioteca de expresiones</span></div></div>
    <div class="acciones"><button type="button" class="boton" id="tema" aria-pressed="false" aria-label="Ver con fondo oscuro">${icono('luna')}<span id="etiqueta-tema">Fondo oscuro</span></button><a class="boton" href="vista-general.png" target="_blank" rel="noopener" aria-label="Abrir lámina completa">${icono('lamina')}<span>Ver lámina</span></a></div>
  </header>
  <main>
    <section class="hero" aria-labelledby="titulo">
      <div><p class="sobretitulo">Colección 01 · Reserva creativa</p><h1 id="titulo">El mismo lobo.<br>Todas sus emociones.</h1><p class="introduccion">Una familia de expresiones con la identidad de ClubsUNID. Guardadas, organizadas y listas para cuando llegue su momento.</p><div class="cifras"><span><strong>${REACCIONES.length}</strong> expresiones</span><span><strong>${originales}</strong> originales</span><span><strong>${REACCIONES.length - originales}</strong> en reserva</span></div></div>
      <div class="muestrario" aria-hidden="true"><p class="muestrario__etiqueta">UNA MISMA IDENTIDAD</p><span class="muestrario__lobo muestrario__lobo--izquierdo">${lobo('cool', 'hero-cool')}</span><span class="muestrario__lobo">${lobo('celebrate', 'hero-celebrate')}</span><span class="muestrario__lobo muestrario__lobo--derecho">${lobo('hug', 'hero-hug')}</span><p class="muestrario__nota">Dorado, angular y con mucha personalidad.</p></div>
    </section>
    <aside class="aviso">${icono('archivo')}<p><strong>Catálogo para conservar.</strong> Las ${reserva} expresiones nuevas están en reserva. Las tres originales se incluyen como referencia de la familia.</p></aside>
    <section class="seccion" aria-labelledby="coleccion-titulo">
      <div class="titulo-fila"><h2 id="coleccion-titulo">Explora la colección <span class="conteo" id="cantidad">${REACCIONES.length}</span></h2><button type="button" class="boton" id="animar-todas" aria-label="Animar las expresiones visibles">${icono('repetir')}<span>Probar los gestos</span></button></div>
      <div class="herramientas"><div class="filtros" role="group" aria-label="Filtrar por familia">${grupos.map((grupo, indice) => `<button type="button" class="filtro" data-grupo="${grupo}" aria-pressed="${indice === 0}">${grupo}</button>`).join('')}</div><label class="buscar" for="buscar">${icono('buscar')}<span class="solo-lector">Buscar una expresión</span><input type="search" id="buscar" placeholder="Busca una emoción…" autocomplete="off"></label></div>
      <p class="solo-lector" role="status" id="resultados">${REACCIONES.length} expresiones disponibles.</p>
      <div class="rejilla">${REACCIONES.map(tarjeta).join('\n')}</div>
      <div class="vacio" id="vacio" hidden><p>No encontramos esa expresión. Prueba con otra palabra.</p><button type="button" id="limpiar">Ver toda la colección</button></div>
    </section>
  </main>
  <footer class="pie"><p><strong>ClubsUNID</strong> · Colección de reacciones · v${versionCorta}</p><p id="nota-movimiento">Pasa el cursor o enfoca un lobo para ver su gesto. Tócalo para ampliarlo.</p><p>SVG + PNG · Fondo transparente</p></footer>
</div>
<dialog id="detalle" aria-labelledby="detalle-titulo" aria-describedby="detalle-gesto"><div class="detalle__interior">
  <button type="button" class="cerrar" id="cerrar" aria-label="Cerrar vista ampliada">${icono('cerrar')}</button>
  <p class="sobretitulo" id="detalle-estado"></p><h2 class="detalle__titulo" id="detalle-titulo"></h2><p class="detalle__gesto" id="detalle-gesto"></p>
  <div class="detalle__lienzo"><div class="detalle__imagen" id="detalle-imagen"></div></div>
  <div class="detalle__opciones"><div class="tamanos" role="group" aria-label="Tamaño de vista previa">${[48, 96, 160].map((tamano) => `<button type="button" class="tamano" data-tamano="${tamano}" aria-pressed="${tamano === 160}" aria-label="Ver a ${tamano} píxeles de ancho">${tamano}</button>`).join('')}</div><button type="button" class="boton" id="repetir">${icono('repetir')}Repetir gesto</button></div>
  <div class="acciones"><a class="boton boton--principal" id="detalle-descargar" download>${icono('descargar')}Descargar SVG</a><a class="boton" id="detalle-png" download>${icono('descargar')}PNG</a></div><p class="detalle__nota" id="detalle-nota"></p>
</div></dialog>
<script>${js}</script>
</body>
</html>`;

function lamina() {
  const margen = 64;
  const espacio = 16;
  const columnas = 7;
  const filas = Math.ceil(REACCIONES.length / columnas);
  const anchoTarjeta = 232;
  const altoTarjeta = 244;
  const inicioY = 242;
  const ancho = margen * 2 + columnas * anchoTarjeta + (columnas - 1) * espacio;
  const pieY = inicioY + filas * (altoTarjeta + espacio) - espacio + 44;
  const alto = pieY + 80;
  const tarjetas = REACCIONES.map((reaccion, indice) => {
    const x = margen + (indice % columnas) * (anchoTarjeta + espacio);
    const y = inicioY + Math.floor(indice / columnas) * (altoTarjeta + espacio);
    return `<g><rect x="${x}" y="${y}" width="${anchoTarjeta}" height="${altoTarjeta}" rx="18" fill="#fffefb" stroke="#e7e1e9"/>
      <text x="${x + 18}" y="${y + 26}" font-size="12" fill="#877c90">${reaccion.numero}</text>
      <circle cx="${x + anchoTarjeta - 85}" cy="${y + 22}" r="2.5" fill="${reaccion.original ? '#aa8531' : '#b9adbe'}"/>
      <text x="${x + anchoTarjeta - 75}" y="${y + 26}" font-size="10" fill="${reaccion.original ? '#654281' : '#877c90'}">${reaccion.original ? 'Original' : 'En reserva'}</text>
      ${dibujarLobo(reaccion, { prefijo: 'lamina-' + reaccion.id, decorativo: true, posicion: `x="${x + 56}" y="${y + 44}" width="120" height="125"` })}
      <text x="${x + anchoTarjeta / 2}" y="${y + 203}" text-anchor="middle" font-size="18" font-weight="600" fill="#291a36">${escapar(reaccion.nombre)}</text>
      <text x="${x + anchoTarjeta / 2}" y="${y + 224}" text-anchor="middle" font-size="11" fill="#877c90">${escapar(reaccion.grupo)}</text></g>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" role="img" aria-labelledby="titulo descripcion">
    <title id="titulo">Catálogo de reacciones del lobo de ClubsUNID</title><desc id="descripcion">${REACCIONES.length} expresiones: ${originales} originales y ${reserva} propuestas en reserva. Silueta angular dorada con contorno morado.</desc>
    <rect width="${ancho}" height="${alto}" fill="#f7f5ef"/>
    <g font-family="Avenir Next, DejaVu Sans, Arial, sans-serif">
      <circle cx="69" cy="56" r="4" fill="#aa8531"/><text x="84" y="61" font-size="13" letter-spacing="2.4" font-weight="600" fill="#654281">CLUBSUNID / BIBLIOTECA DE EXPRESIONES</text>
      <text x="64" y="132" font-size="54" font-weight="700" letter-spacing="-2.2" fill="#291a36">Un lobo. ${REACCIONES.length} formas de sentir.</text>
      <text x="66" y="175" font-size="19" fill="#756c7e">${originales} reacciones originales + ${reserva} expresiones en reserva para uso futuro.</text>
      <rect x="${ancho - margen - 214}" y="92" width="214" height="40" rx="20" fill="#eee5f4"/><text x="${ancho - margen - 107}" y="118" text-anchor="middle" font-size="13" fill="#654281">COLECCIÓN 01 · v${versionCorta}</text>
      <path d="M64 208H${ancho - margen}" stroke="#e0d8e5"/>
      ${tarjetas}
      <path d="M64 ${pieY}H${ancho - margen}" stroke="#e0d8e5"/>
      <text x="64" y="${pieY + 38}" font-size="13" fill="#756c7e">Misma silueta · Dorado y morado · Archivos SVG y PNG con fondo transparente</text>
      <text x="${ancho - margen}" y="${pieY + 38}" text-anchor="end" font-size="13" fill="#654281">RESERVA CREATIVA</text>
    </g>
  </svg>`;
}

const manifiesto = {
  nombre: 'Reacciones del lobo de ClubsUNID',
  version,
  fecha: '2026-11-25',
  finalidad: 'Biblioteca de diseño para conservar. Las variantes nuevas no están habilitadas en la aplicación.',
  referencia: 'src/components/actividades/LoboReaccion.jsx',
  viewBox: '0 0 96 100',
  fondo: 'transparente',
  originales,
  reserva,
  reacciones: REACCIONES.map(({ id, archivo, nombre, grupo, gesto, original, numero }) => ({ numero, id, nombre, grupo, estado: original ? 'original' : 'reserva', svg: `svg/${archivo}.svg`, png: `png/${archivo}.png`, gesto })),
};

await mkdir(new URL('svg/', raiz), { recursive: true });
await Promise.all([
  writeFile(new URL('index.html', raiz), normalizarTexto(html)),
  writeFile(new URL('vista-general.svg', raiz), normalizarTexto(lamina())),
  writeFile(new URL('manifest.json', raiz), JSON.stringify(manifiesto, null, 2) + '\n'),
  writeFile(new URL('animaciones.css', raiz), ANIMACIONES_CSS.trim() + '\n'),
  ...REACCIONES.map((reaccion) => writeFile(new URL(`svg/${reaccion.archivo}.svg`, raiz), normalizarTexto(dibujarLobo(reaccion)) + '\n')),
]);

if (process.argv.includes('--png')) {
  const { default: sharp } = await import(process.env.CATALOGO_SHARP || 'sharp');
  await mkdir(new URL('png/', raiz), { recursive: true });
  await Promise.all(REACCIONES.map((reaccion) => sharp(Buffer.from(dibujarLobo(reaccion))).resize(768, 800).png().toFile(fileURLToPath(new URL(`png/${reaccion.archivo}.png`, raiz)))));
  await sharp(Buffer.from(lamina())).png().toFile(fileURLToPath(new URL('vista-general.png', raiz)));
  console.log(`${REACCIONES.length} PNG transparentes (768 × 800) y lámina PNG exportados.`);
}
console.log(`${REACCIONES.length} SVG, galería, lámina y manifiesto guardados en ${fileURLToPath(raiz)}`);
