import { normalizarCategoriaEvento } from '../constants/categoriasEvento.js';

export function claveLocal(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function fechaEvento(valor) {
  return valor ? String(valor).slice(0, 10) : '';
}

export function capitalizarInicial(valor) {
  return valor.charAt(0).toLocaleUpperCase('es-MX') + valor.slice(1);
}

export function fechaLegible(clave, corta = false) {
  if (!clave) return '';
  return capitalizarInicial(new Date(`${clave}T12:00:00`).toLocaleDateString('es-MX', corta
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}

export function periodoEvento(evento) {
  return periodoFechas(evento.fecha_evento, evento.fecha_fin_evento);
}

function periodoFechas(desde, hasta) {
  const inicio = fechaEvento(desde);
  const fin = fechaEvento(hasta);
  return fin && fin !== inicio ? `${fechaLegible(inicio, true)} – ${fechaLegible(fin, true)}` : fechaLegible(inicio, true);
}

export function periodoFechaAcademica(fecha) {
  return periodoFechas(fecha.fecha_inicio, fecha.fecha_fin);
}

// La agenda reúne dos recursos independientes solo para presentarlos en el calendario.
export function elementosCalendario(eventos, fechas) {
  return [
    ...eventos.map((evento) => ({ clave: `evento-${evento.id_noticia}`, origen: 'evento', tipo: normalizarCategoriaEvento(evento.categoria_evento), titulo: evento.titulo, inicio: fechaEvento(evento.fecha_evento), fin: fechaEvento(evento.fecha_fin_evento), hora: evento.hora_evento, descripcion: evento.contenido, original: evento })),
    ...fechas.map((fecha) => ({ clave: `fecha-${fecha.id_fecha}`, origen: 'fecha', tipo: fecha.tipo_fecha, titulo: fecha.titulo, inicio: fechaEvento(fecha.fecha_inicio), fin: fechaEvento(fecha.fecha_fin), descripcion: fecha.nota, original: fecha })),
  ];
}

export function periodoElemento(elemento) {
  return periodoFechas(elemento.inicio, elemento.fin);
}

export function elementosEnFecha(elementos, clave) {
  return elementos.filter(({ inicio, fin: hasta }) => {
    const fin = hasta || inicio;
    return inicio && inicio <= clave && fin >= clave;
  }).sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')) || a.titulo.localeCompare(b.titulo, 'es'));
}

export function elementosEnMes(elementos, mes, filtro = 'todos') {
  const inicio = claveLocal(new Date(mes.getFullYear(), mes.getMonth(), 1));
  const fin = claveLocal(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
  return elementos.filter((elemento) => {
    const fecha = elemento.inicio;
    return fecha && fecha <= fin && (elemento.fin || fecha) >= inicio &&
      (filtro === 'todos' || `${elemento.origen}:${elemento.tipo}` === filtro);
  });
}

export function publicacionesMural(publicaciones, hoy) {
  return publicaciones.filter((item) => item.mostrar_en_mural && item.publicada !== false &&
    (!item.fecha_retiro || fechaEvento(item.fecha_retiro) >= hoy) &&
    (!(item.fecha_evento || item.fecha_inicio) || (fechaEvento(item.fecha_fin_evento || item.fecha_fin) || fechaEvento(item.fecha_evento || item.fecha_inicio)) >= hoy)
  ).sort((a, b) =>
    Number(!!b.destacada) - Number(!!a.destacada) ||
    String(b.fecha_publicacion || b.fecha_creacion || b.fecha_inicio || '').localeCompare(String(a.fecha_publicacion || a.fecha_creacion || a.fecha_inicio || ''))
  );
}
