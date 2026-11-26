const tarjetas = [...document.querySelectorAll('.tarjeta')];
const filtros = [...document.querySelectorAll('.filtro')];
const buscador = document.querySelector('#buscar');
const dialogo = document.querySelector('#detalle');
const temporizadores = new WeakMap();
const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
let grupo = 'Todas';
let tarjetaActual = null;

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function animar(svg) {
  if (!svg || movimientoReducido.matches) return;
  clearTimeout(temporizadores.get(svg));
  svg.classList.remove('lobo-reaccion--animado');
  // Reinicia el gesto incluso si se pulsa de nuevo antes de que termine.
  void svg.getBoundingClientRect();
  svg.classList.add('lobo-reaccion--animado');
  temporizadores.set(svg, setTimeout(() => svg.classList.remove('lobo-reaccion--animado'), 760));
}

function filtrar() {
  const busqueda = normalizar(buscador.value);
  const palabras = busqueda.split(/\s+/).filter(Boolean);
  let visibles = 0;
  for (const tarjeta of tarjetas) {
    const coincide = (grupo === 'Todas' || tarjeta.dataset.grupo === grupo)
      && palabras.every((palabra) => normalizar(tarjeta.dataset.busqueda).includes(palabra));
    tarjeta.hidden = !coincide;
    if (coincide) visibles += 1;
  }
  document.querySelector('#cantidad').textContent = visibles;
  document.querySelector('#resultados').textContent = `${visibles} ${visibles === 1 ? 'expresión disponible' : 'expresiones disponibles'}.`;
  document.querySelector('#vacio').hidden = visibles !== 0;
  document.querySelector('#animar-todas').disabled = visibles === 0 || movimientoReducido.matches;
}

for (const filtro of filtros) {
  filtro.addEventListener('click', () => {
    grupo = filtro.dataset.grupo;
    for (const boton of filtros) boton.setAttribute('aria-pressed', String(boton === filtro));
    filtrar();
  });
}
buscador.addEventListener('input', filtrar);
document.querySelector('#limpiar').addEventListener('click', () => {
  grupo = 'Todas';
  buscador.value = '';
  for (const filtro of filtros) filtro.setAttribute('aria-pressed', String(filtro.dataset.grupo === grupo));
  filtrar();
  buscador.focus();
});

document.querySelector('#tema').addEventListener('click', (evento) => {
  const oscuro = document.documentElement.dataset.tema !== 'oscuro';
  document.documentElement.dataset.tema = oscuro ? 'oscuro' : 'claro';
  evento.currentTarget.setAttribute('aria-pressed', String(oscuro));
  evento.currentTarget.setAttribute('aria-label', oscuro ? 'Ver con fondo claro' : 'Ver con fondo oscuro');
  document.querySelector('#etiqueta-tema').textContent = oscuro ? 'Fondo claro' : 'Fondo oscuro';
});

function abrirDetalle(tarjeta) {
  tarjetaActual = tarjeta;
  const destino = document.querySelector('#detalle-imagen');
  // Recrea el SVG con IDs propios para no repetir los gradientes de la tarjeta.
  const copia = tarjeta.querySelector('svg.lobo-reaccion').cloneNode(true);
  copia.classList.remove('lobo-reaccion--animado');
  for (const elemento of [copia, ...copia.querySelectorAll('*')]) {
    for (const atributo of [...elemento.attributes]) {
      if (atributo.name === 'id' || atributo.name === 'aria-labelledby' || atributo.value.includes('url(#')) {
        elemento.setAttribute(atributo.name, atributo.value.replaceAll('tarjeta-', 'detalle-'));
      }
    }
  }
  destino.replaceChildren(copia);
  document.querySelector('#detalle-titulo').textContent = tarjeta.dataset.nombre;
  document.querySelector('#detalle-gesto').textContent = tarjeta.dataset.gesto;
  document.querySelector('#detalle-estado').textContent = `${tarjeta.dataset.grupo} · ${tarjeta.dataset.original === 'true' ? 'Variante original' : 'En reserva'}`;
  document.querySelector('#detalle-nota').textContent = tarjeta.dataset.original === 'true'
    ? 'Copia de diseño de una de las tres reacciones originales.'
    : 'Expresión guardada para uso futuro. Aún no está habilitada en la aplicación.';
  const descarga = document.querySelector('#detalle-descargar');
  descarga.href = tarjeta.querySelector('.descargar').getAttribute('href');
  descarga.download = tarjeta.querySelector('.descargar').download;
  const png = document.querySelector('#detalle-png');
  png.href = descarga.getAttribute('href').replace(/^svg\//, 'png/').replace(/\.svg$/, '.png');
  png.download = descarga.download.replace(/\.svg$/, '.png');
  seleccionarTamano(160);
  dialogo.showModal();
  animar(copia);
}

for (const tarjeta of tarjetas) {
  const boton = tarjeta.querySelector('.tarjeta__ver');
  boton.addEventListener('pointerenter', () => animar(tarjeta.querySelector('svg')));
  boton.addEventListener('focus', () => animar(tarjeta.querySelector('svg')));
  boton.addEventListener('click', () => abrirDetalle(tarjeta));
}

document.querySelector('#cerrar').addEventListener('click', () => dialogo.close());
dialogo.addEventListener('click', (evento) => {
  if (evento.target === dialogo) {
    const rectangulo = dialogo.getBoundingClientRect();
    if (evento.clientX < rectangulo.left || evento.clientX > rectangulo.right || evento.clientY < rectangulo.top || evento.clientY > rectangulo.bottom) dialogo.close();
  }
});
dialogo.addEventListener('close', () => tarjetaActual?.querySelector('.tarjeta__ver').focus());
document.querySelector('#repetir').addEventListener('click', () => animar(document.querySelector('#detalle-imagen svg')));

function seleccionarTamano(tamano) {
  const imagen = document.querySelector('#detalle-imagen');
  imagen.style.width = `${tamano}px`;
  imagen.style.height = `${tamano * 100 / 96}px`;
  for (const boton of document.querySelectorAll('.tamano')) boton.setAttribute('aria-pressed', String(Number(boton.dataset.tamano) === tamano));
}
for (const boton of document.querySelectorAll('.tamano')) boton.addEventListener('click', () => seleccionarTamano(Number(boton.dataset.tamano)));

document.querySelector('#animar-todas').addEventListener('click', () => {
  for (const tarjeta of tarjetas.filter((elemento) => !elemento.hidden)) animar(tarjeta.querySelector('svg'));
});

function actualizarMovimiento() {
  document.querySelector('#repetir').disabled = movimientoReducido.matches;
  document.querySelector('#nota-movimiento').textContent = movimientoReducido.matches
    ? 'Tu dispositivo tiene activado el movimiento reducido; las expresiones se muestran quietas.'
    : 'Pasa el cursor o enfoca un lobo para ver su gesto. Tócalo para ampliarlo.';
  filtrar();
}
movimientoReducido.addEventListener('change', actualizarMovimiento);
actualizarMovimiento();
