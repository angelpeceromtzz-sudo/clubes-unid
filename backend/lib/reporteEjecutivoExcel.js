import XLSX from 'xlsx';

const numero = (valor) => Number(valor) || 0;
const proporcion = (numerador, denominador) => numero(denominador) > 0 ? numero(numerador) / numero(denominador) : null;

function agregarHoja(libro, nombre, descripcion, encabezados, filas, porcentajes = []) {
  const datos = [[nombre], [descripcion], [], encabezados, ...filas];
  if (!filas.length) datos.push(['Sin registros para los filtros seleccionados.']);
  const hoja = XLSX.utils.aoa_to_sheet(datos);
  const ultimaColumna = encabezados.length - 1;
  hoja['!merges'] = [0, 1].map((r) => ({ s: { r, c: 0 }, e: { r, c: ultimaColumna } }));
  hoja['!cols'] = encabezados.map((encabezado, c) => ({
    wch: Math.min(76, Math.max(18, String(encabezado).length + 3, ...filas.map((fila) =>
      typeof fila[c] === 'string' ? Math.min(fila[c].length + 2, 76) : 18))),
  }));
  hoja['!rows'] = [{ hpt: 28 }, { hpt: 30 }, { hpt: 10 }, { hpt: 26 }];
  hoja['!margins'] = { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
  if (filas.length) hoja['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: filas.length + 3, c: ultimaColumna } }) };
  filas.forEach((fila, r) => fila.forEach((valor, c) => {
    const celda = hoja[XLSX.utils.encode_cell({ r: r + 4, c })];
    if (celda?.t === 'n') celda.z = porcentajes.includes(c) ? '0.0%' : '#,##0';
    if (valor === null && porcentajes.includes(c)) hoja[XLSX.utils.encode_cell({ r: r + 4, c })] = { t: 's', v: 'Sin base de cálculo' };
  }));
  XLSX.utils.book_append_sheet(libro, hoja, nombre);
  return hoja;
}

export function crearLibroEjecutivo(datos) {
  const { filtros, nombresFiltros, generadoEn = new Date() } = datos;
  const libro = XLSX.utils.book_new();
  libro.Props = { Title: 'Reporte ejecutivo - Clubs UNID', Author: 'Clubs UNID', Subject: 'Estadísticas de clubes universitarios', CreatedDate: generadoEn };
  const evaluadas = datos.asistencia.reduce((suma, fila) => suma + numero(fila.presentes) + numero(fila.ausentes), 0);
  const presentes = datos.asistencia.reduce((suma, fila) => suma + numero(fila.presentes), 0);
  const kpis = agregarHoja(libro, 'KPIs', 'Indicadores y alcance de cada cálculo.', ['Indicador', 'Valor', 'Alcance'], [
    ['Alumnos registrados activos', numero(datos.totalAlumnos), 'Situación actual de la plataforma'],
    ['Alumnos con inscripción activa', numero(datos.alumnosInscritos), 'Situación actual; filtro de club'],
    ['Participación', proporcion(datos.alumnosInscritos, datos.totalAlumnos), 'Inscritos / alumnos registrados activos'],
    ['Clubes activos', numero(datos.totalClubes), 'Todos los clubes activos; situación actual'],
    ['Ocupación total', proporcion(datos.ocupacion.ocupado_total, datos.ocupacion.cupo_total), 'Plazas ocupadas / cupo de todos los clubes activos'],
    ['Asistencia promedio', proporcion(presentes, evaluadas), 'Presentes / (presentes + ausentes); club y periodo'],
    ['Respuestas de encuestas', datos.encuestas.reduce((suma, fila) => suma + numero(fila.total_respuestas), 0), 'Conjunto de encuestas; filtro de licenciatura'],
  ]);
  for (const fila of [7, 9, 10]) {
    if (kpis[`B${fila}`]?.t === 'n') kpis[`B${fila}`].z = '0.0%';
    else kpis[`B${fila}`] = { t: 's', v: 'Sin base de cálculo' };
  }
  agregarHoja(libro, 'Alcance', 'Reporte ejecutivo - Clubs UNID', ['Concepto', 'Detalle'], [
    ['Generado el', generadoEn.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })],
    ['Zona horaria', 'America/Mexico_City'],
    ['Club', nombresFiltros.club || filtros.id_club || 'Todos los clubes'],
    ['Periodo', nombresFiltros.periodo || filtros.id_periodo || 'Todos los periodos'],
    ['Licenciatura', nombresFiltros.licenciatura || filtros.carrera || 'Todas las licenciaturas'],
    ['Estado de postulación', filtros.estado || 'Todos los estados'],
    ['Clubes', 'Situación actual; filtro de club'],
    ['Asistencia', 'Sesiones completadas; filtros de club y periodo. Justificadas fuera del porcentaje.'],
    ['Encuestas', 'Conjunto de encuestas; filtro de licenciatura'],
    ['Postulaciones', 'Filtros de club, periodo, licenciatura y estado'],
    ['Evolución mensual', 'Últimos 6 meses, dentro del periodo seleccionado si lo hay'],
    ['Inscripciones mensuales', 'Altas activas; filtros de club y periodo'],
    ['Sin base de cálculo', 'El porcentaje no se calcula cuando el denominador es cero.'],
  ]);
  agregarHoja(libro, 'Clubes', 'Clubes activos; situación actual y filtro de club.',
    ['Club', 'Cupo total', 'Integrantes activos', 'Plazas disponibles', 'Ocupación'],
    datos.clubes.map((fila) => [fila.nombre_club, numero(fila.cupo_maximo), numero(fila.cupo_ocupado), Math.max(numero(fila.cupo_maximo) - numero(fila.cupo_ocupado), 0), proporcion(fila.cupo_ocupado, fila.cupo_maximo)]), [4]);
  agregarHoja(libro, 'Asistencia', 'Sesiones completadas; justificadas excluidas del porcentaje.',
    ['Club', 'Presentes', 'Ausentes', 'Justificadas', 'Registros totales', 'Asistencia'],
    datos.asistencia.map((fila) => [fila.nombre_club, numero(fila.presentes), numero(fila.ausentes), numero(fila.justificadas), numero(fila.total), proporcion(fila.presentes, numero(fila.presentes) + numero(fila.ausentes))]), [5]);
  agregarHoja(libro, 'Encuestas', 'Respuestas por encuesta; filtro de licenciatura.', ['Encuesta', 'Estado', 'Respuestas'],
    datos.encuestas.map((fila) => [fila.titulo, fila.estado, numero(fila.total_respuestas)]));
  const licenciaturas = datos.porLicenciatura.map((fila) => [fila.nombre, numero(fila.respuestas)]);
  if (!filtros.carrera && numero(datos.sinLicenciatura) > 0) licenciaturas.push(['Sin licenciatura', numero(datos.sinLicenciatura)]);
  agregarHoja(libro, 'Encuestas por licenciatura', 'Conjunto de encuestas; incluye respuestas sin licenciatura.', ['Licenciatura', 'Respuestas'], licenciaturas);
  agregarHoja(libro, 'Postulaciones por estado', 'Postulaciones con los filtros seleccionados.', ['Estado de postulación', 'Postulaciones'],
    datos.postulaciones.map((fila) => [fila.status, numero(fila.total)]));
  const meses = new Map();
  for (const fila of datos.evolucionPostulaciones) meses.set(fila.mes, [fila.mes, numero(fila.total), 0]);
  for (const fila of datos.evolucionInscripciones) {
    const mes = meses.get(fila.mes) || [fila.mes, 0, 0];
    mes[2] = numero(fila.total);
    meses.set(fila.mes, mes);
  }
  agregarHoja(libro, 'Evolución mensual', 'Últimos 6 meses; respeta el periodo seleccionado.', ['Mes (AAAA-MM)', 'Postulaciones', 'Altas de inscripción'],
    [...meses.values()].sort((a, b) => a[0].localeCompare(b[0])));
  return libro;
}
