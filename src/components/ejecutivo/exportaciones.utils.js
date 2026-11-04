export const TITULOS_REPORTE = {
  resumen: 'Resumen ejecutivo',
  clubes: 'Clubes',
  asistencia: 'Asistencia',
  encuestas: 'Encuestas',
  postulaciones: 'Postulaciones',
};

const numero = (valor) => Number(valor) || 0;
const entero = (valor) => numero(valor).toLocaleString('es-MX');
const porcentaje = (valor, base) => numero(base) > 0 ? `${(numero(valor) / numero(base) * 100).toFixed(1)}%` : 'Sin base';
const suma = (filas, campo) => filas.reduce((total, fila) => total + numero(fila[campo]), 0);

export function nombreArchivoReporte(formato, seccion = 'completo', fecha = new Date()) {
  const dia = fecha.toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });
  return `clubs-unid_estadisticas_${seccion}_${dia}.${formato}`;
}

export function describirFiltros(d, tab) {
  const filtros = d.filtros || {};
  const campos = {
    id_club: ['Club', (d.clubesDetalle || []).find((fila) => String(fila.id_club) === String(filtros.id_club))?.nombre_club],
    id_periodo: ['Periodo', (d.periodos || []).find((fila) => String(fila.id_periodo) === String(filtros.id_periodo))?.nombre],
    carrera: ['Licenciatura', (d.licenciaturas || []).find((fila) => String(fila.id_licenciatura) === String(filtros.carrera))?.nombre],
    estado: ['Estado', filtros.estado],
  };
  const relevantes = { clubes: ['id_club'], asistencia: ['id_club', 'id_periodo'], encuestas: ['carrera'], postulaciones: ['id_club', 'id_periodo', 'carrera', 'estado'] };
  return (relevantes[tab] || Object.keys(campos)).filter((campo) => filtros[campo])
    .map((campo) => `${campos[campo][0]}: ${campos[campo][1] || filtros[campo]}`);
}

export function crearReportePDF(d, tab, fecha = new Date()) {
  const activos = (d.clubesDetalle || []).filter((fila) => fila.estatus === 'activo');
  const clubes = activos.filter((fila) => !d.filtros?.id_club || String(fila.id_club) === String(d.filtros.id_club));
  const global = d.asistencia?.global || {};
  const reporte = {
    titulo: TITULOS_REPORTE[tab] || TITULOS_REPORTE.resumen,
    generadoEn: fecha.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
    actualizadoEn: d.actualizadoEn ? new Date(d.actualizadoEn).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }) : null,
    filtros: describirFiltros(d, tab),
    indicadores: [], tablas: [], graficas: [],
    nota: '',
  };
  const tablaClubes = {
    titulo: 'Detalle completo de clubes activos',
    encabezados: ['Club', 'Cupo', 'Integrantes', 'Disponibles', 'Ocupación'],
    pesos: [3.2, 1, 1.2, 1.2, 1.2],
    filas: clubes.map((fila) => [fila.nombre_club, entero(fila.cupo_maximo), entero(fila.cupo_ocupado), entero(Math.max(numero(fila.cupo_maximo) - numero(fila.cupo_ocupado), 0)), porcentaje(fila.cupo_ocupado, fila.cupo_maximo)]),
  };
  const graficaClubes = {
    titulo: 'Integrantes por club',
    filas: clubes.map((fila) => ({ nombre: fila.nombre_club, valor: numero(fila.cupo_ocupado) })).sort((a, b) => b.valor - a.valor),
  };

  if (tab === 'resumen') {
    const conCupo = activos.filter((fila) => numero(fila.cupo_maximo) > 0);
    reporte.indicadores = [
      ['Participación', porcentaje(d.stats?.alumnosInscritos, d.stats?.totalAlumnos)],
      ['Ocupación global', porcentaje(suma(conCupo, 'cupo_ocupado'), suma(conCupo, 'cupo_maximo'))],
      ['Asistencia', porcentaje(global.presentes, numero(global.presentes) + numero(global.ausentes))],
      ['Respuestas', entero(d.encuestas?.total_respuestas)],
    ];
    reporte.tablas = [{ titulo: 'Comunidad universitaria', encabezados: ['Indicador', 'Total'], pesos: [4, 1], filas: [
      ['Alumnos registrados activos', entero(d.stats?.totalAlumnos)],
      ['Alumnos con inscripción activa (filtro de club)', entero(d.stats?.alumnosInscritos)],
      ['Clubes activos en la plataforma', entero(activos.length)],
    ] }, tablaClubes];
    reporte.graficas = [graficaClubes];
    reporte.nota = 'Participación y ocupación: situación actual. La ocupación global considera todos los clubes activos con cupo. Asistencia: club y periodo. Respuestas: conjunto de encuestas y licenciatura.';
  } else if (tab === 'clubes') {
    reporte.indicadores = [['Clubes activos', entero(clubes.length)], ['Cupo total', entero(suma(clubes, 'cupo_maximo'))], ['Integrantes', entero(suma(clubes, 'cupo_ocupado'))]];
    reporte.tablas = [tablaClubes];
    reporte.graficas = [graficaClubes];
    reporte.nota = 'Situación actual de los clubes activos. El detalle incluye todos los registros, incluso los que no están desplegados en pantalla.';
  } else if (tab === 'asistencia') {
    const filas = d.asistencia?.por_club || [];
    reporte.indicadores = [['Asistencia', porcentaje(global.presentes, numero(global.presentes) + numero(global.ausentes))], ['Presentes', entero(global.presentes)], ['Ausentes', entero(global.ausentes)], ['Justificadas', entero(global.justificadas)]];
    reporte.tablas = [{ titulo: 'Asistencia por club', encabezados: ['Club', 'Presentes', 'Ausentes', 'Justificadas', 'Asistencia'], pesos: [3, 1.1, 1.1, 1.3, 1.2], filas: filas.map((fila) => [fila.nombre_club, entero(fila.presentes), entero(fila.ausentes), entero(fila.justificadas), porcentaje(fila.presentes, numero(fila.presentes) + numero(fila.ausentes))]) }];
    reporte.graficas = [{ titulo: 'Asistencia por club (%)', porcentaje: true, filas: filas.filter((fila) => numero(fila.presentes) + numero(fila.ausentes) > 0).map((fila) => ({ nombre: fila.nombre_club, valor: numero(fila.presentes) / (numero(fila.presentes) + numero(fila.ausentes)) * 100 })) }];
    reporte.nota = 'Sólo sesiones completadas. Asistencia = presentes / (presentes + ausentes). Las justificadas se muestran por separado y no entran en el porcentaje.';
  } else if (tab === 'encuestas') {
    const licenciaturas = (d.encuestas?.por_licenciatura || []).map((fila) => ({ nombre: fila.nombre, valor: numero(fila.respuestas) }));
    if (numero(d.encuestas?.sin_licenciatura) > 0) licenciaturas.push({ nombre: 'Sin licenciatura', valor: numero(d.encuestas.sin_licenciatura) });
    reporte.indicadores = [['Respuestas recibidas', entero(d.encuestas?.total_respuestas)]];
    reporte.tablas = [{ titulo: 'Respuestas por licenciatura', encabezados: ['Licenciatura', 'Respuestas'], pesos: [4, 1], filas: licenciaturas.map((fila) => [fila.nombre, entero(fila.valor)]) }];
    reporte.graficas = [{ titulo: 'Respuestas por licenciatura', filas: licenciaturas }];
    const encuesta = (d.listaEncuestas || []).find((fila) => String(fila.id_encuesta) === String(d.encuestaSeleccionada));
    const pregunta = (d.resultadosEncuesta?.preguntas || []).find((fila) => String(fila.id_pregunta) === String(d.preguntaSeleccionada));
    if (encuesta) reporte.filtros.push(`Encuesta: ${encuesta.titulo}`);
    if (pregunta) {
      const titulo = pregunta.texto;
      if (['texto_corto', 'texto_largo'].includes(pregunta.tipo)) {
        const textos = pregunta.textos || [];
        const total = pregunta.total_textos ?? textos.length;
        reporte.tablas.push({ titulo, descripcion: total > textos.length ? `Muestra disponible: ${entero(textos.length)} de ${entero(total)} respuestas abiertas.` : `${entero(total)} respuestas abiertas.`, encabezados: ['Respuesta abierta'], pesos: [1], filas: textos.map((fila) => [fila.texto]) });
      } else {
        const escala = pregunta.tipo === 'escala';
        const multiple = pregunta.tipo === 'opcion_multiple';
        const opciones = (escala ? pregunta.distribucion : pregunta.opciones) || [];
        const descripcion = multiple ? `${entero(pregunta.respondientes)} respondientes. Cada persona puede elegir varias opciones.` : `${entero(pregunta.respuestas)} respuestas a esta pregunta.`;
        reporte.tablas.push({ titulo, descripcion, encabezados: [escala ? 'Valor de escala' : 'Opción', 'Respuestas', 'Porcentaje'], pesos: [4, 1.2, 1.2], filas: opciones.map((fila) => [String(escala ? fila.valor : fila.texto), entero(fila.conteo), fila.porcentaje == null ? 'Sin base' : `${numero(fila.porcentaje).toFixed(1)}%`]) });
        reporte.graficas.push({ titulo, filas: opciones.map((fila) => ({ nombre: String(escala ? fila.valor : fila.texto), valor: numero(fila.conteo) })) });
        if (escala) reporte.indicadores.push(['Promedio de escala', pregunta.promedio == null ? 'Sin base' : String(pregunta.promedio)]);
      }
    }
    reporte.nota = 'La distribución por licenciatura incluye el conjunto de encuestas. El detalle por pregunta corresponde a la encuesta y pregunta seleccionadas. En opción múltiple los porcentajes pueden sumar más de 100%.';
  } else if (tab === 'postulaciones') {
    const meses = new Map();
    for (const fila of d.dashboardData?.postulacionesPorMes || []) meses.set(fila.clave, [fila.clave, numero(fila.total), 0]);
    for (const fila of d.dashboardData?.inscripcionesPorMes || []) {
      const mes = meses.get(fila.clave) || [fila.clave, 0, 0];
      mes[2] = numero(fila.total);
      meses.set(fila.clave, mes);
    }
    const filas = [...meses.values()].sort((a, b) => a[0].localeCompare(b[0]));
    reporte.indicadores = [['Solicitudes pendientes', entero(d.dashboardData?.solicitudesPendientes)]];
    reporte.tablas = [{ titulo: 'Evolución mensual', encabezados: ['Mes', 'Postulaciones', 'Altas de inscripción'], pesos: [2, 2, 2], filas: filas.map((fila) => [fila[0], entero(fila[1]), entero(fila[2])]) }];
    reporte.graficas = [{ titulo: 'Postulaciones por mes', filas: filas.map((fila) => ({ nombre: fila[0], valor: fila[1] })) }];
    reporte.nota = 'Últimos 6 meses, dentro del periodo seleccionado si lo hay. Pendientes: estados Pendiente o En revisión. Licenciatura y estado filtran postulaciones; las altas de inscripción se filtran por club y periodo.';
  }
  return reporte;
}
