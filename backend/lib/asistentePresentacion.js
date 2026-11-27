const urlClub = (fila, panel) => fila.estado_publicacion === 'publicada' && fila.estatus !== 'inactivo' ? `/campus/campeche/portal/club/${fila.id_club}` : `${panel}?seccion=clubes`;
const urlActividad = (fila, panel) => fila.estado_publicacion === 'publicada' && fila.slug ? `/actividades/${encodeURIComponent(fila.slug)}` : `${panel}?seccion=${panel === '/rectoria/panel' ? 'revision-actividades' : 'gestion-actividades'}`;

export function crearPresentacion({ tipo, rows, datos, pregunta, rol }) {
  const consultadoEn = new Date().toISOString();
  const panel = rol === 4 ? '/rectoria/panel' : rol === 7 ? '/campus/campeche/coordinacion/panel' : '/admin/panel';
  const seccionUsuarios = rol === 4 ? 'padron' : rol === 7 ? 'expediente' : 'usuarios';
  const fuente = (nombre, url) => ({ nombre, url, consultadoEn });
  const resultado = { fuentes: [], visualizacion: null, contexto: null };

  if (tipo === 'usuarios' && rows.length === 1) {
    const usuario = rows[0];
    resultado.contexto = { tipo, id: usuario.id_usuario, nombre: usuario.nombre_completo };
    const url = usuario.id_rol === 1 ? `${panel}?seccion=expediente&usuario=${usuario.id_usuario}` : rol === 7 ? null : `${panel}?seccion=${seccionUsuarios}`;
    resultado.fuentes = [fuente(usuario.id_rol === 1 ? `Expediente de ${usuario.nombre_completo}` : `Usuarios: ${usuario.nombre_completo}`, url)];
  } else if (tipo === 'clubes' && rows.length === 1 && datos?.club) {
    const club = datos.club;
    resultado.contexto = { tipo, id: club.id_club, nombre: club.nombre_club };
    resultado.fuentes = [fuente(`Club: ${club.nombre_club}`, urlClub(club, panel))];
    const activos = datos.membresias?.find(item => item.estatus === 'activo')?.total || 0;
    resultado.visualizacion = { tipo: 'metrica', titulo: 'Miembros activos', valor: activos, detalle: club.nombre_club };
  } else if (tipo === 'actividades' && rows.length === 1 && datos?.actividad) {
    const actividad = datos.actividad;
    resultado.contexto = { tipo, id: actividad.id_club, nombre: actividad.nombre_club };
    resultado.fuentes = [fuente(`Actividad: ${actividad.nombre_club}`, urlActividad(actividad, panel))];
    resultado.visualizacion = { tipo: 'metrica', titulo: 'Inscripciones', valor: datos.total?.inscripciones || 0, detalle: actividad.nombre_club };
  } else if (tipo === 'clubes_estadisticas') {
    const ascendente = /\b(?:menos|menor)\b/i.test(pregunta);
    const ordenados = [...rows].sort((a, b) => (ascendente ? a.miembros_activos - b.miembros_activos : b.miembros_activos - a.miembros_activos) || a.nombre_club.localeCompare(b.nombre_club));
    resultado.fuentes = ordenados.slice(0, 3).map(row => fuente(row.nombre_club, urlClub(row, panel)));
    if (ordenados[0] && ordenados[0].miembros_activos !== ordenados[1]?.miembros_activos && /(?:qu[eé]|cu[aá]l|mayor|m[aá]s|menos|menor)/i.test(pregunta)) resultado.contexto = { tipo: 'clubes', id: ordenados[0].id_club, nombre: ordenados[0].nombre_club };
    resultado.visualizacion = { tipo: 'ranking', titulo: 'Miembros activos por club', unidad: 'miembros', elementos: ordenados.slice(0, 5).map(row => ({ nombre: row.nombre_club, valor: row.miembros_activos, url: urlClub(row, panel) })) };
  } else if (tipo === 'actividades_estadisticas') {
    const campo = /asisten/i.test(pregunta) ? 'asistencias' : /edicion/i.test(pregunta) ? 'ediciones' : 'registros_confirmados';
    const etiqueta = { asistencias: 'Asistencias', ediciones: 'Ediciones', registros_confirmados: 'Registros confirmados' }[campo];
    const ascendente = /\b(?:menos|menor)\b/i.test(pregunta);
    const ordenadas = [...rows].sort((a, b) => (ascendente ? a[campo] - b[campo] : b[campo] - a[campo]) || a.nombre_club.localeCompare(b.nombre_club));
    resultado.fuentes = ordenadas.slice(0, 3).map(row => fuente(row.nombre_club, urlActividad(row, panel)));
    if (ordenadas[0] && ordenadas[0][campo] !== ordenadas[1]?.[campo] && /(?:qu[eé]|cu[aá]l|mayor|m[aá]s|menos|menor)/i.test(pregunta)) resultado.contexto = { tipo: 'actividades', id: ordenadas[0].id_club, nombre: ordenadas[0].nombre_club };
    resultado.visualizacion = { tipo: 'ranking', titulo: `${etiqueta} por actividad`, unidad: etiqueta.toLowerCase(), elementos: ordenadas.slice(0, 5).map(row => ({ nombre: row.nombre_club, valor: row[campo], url: urlActividad(row, panel) })) };
  } else if (tipo === 'alumnos_total') {
    resultado.fuentes = [fuente('Usuarios con rol alumno', `${panel}?seccion=${seccionUsuarios}`)];
    resultado.visualizacion = { tipo: 'metrica', titulo: 'Alumnos con cuenta activa', valor: rows[0]?.total_alumnos || 0 };
  } else if (tipo === 'roles_totales') {
    resultado.fuentes = [fuente('Usuarios por rol', rol === 7 ? null : `${panel}?seccion=${seccionUsuarios}`)];
    resultado.visualizacion = { tipo: 'ranking', titulo: 'Cuentas activas por rol', unidad: 'usuarios', elementos: rows.filter(row => row.total > 0).sort((a, b) => b.total - a.total).map(row => ({ nombre: row.rol.replaceAll('_', ' '), valor: row.total })) };
  } else if (tipo === 'clubes' || tipo === 'actividades') {
    resultado.fuentes = rows.slice(0, 3).map(row => fuente(row.nombre_club, tipo === 'clubes' ? urlClub(row, panel) : urlActividad(row, panel)));
    if (tipo === 'clubes' && !datos?.club && !pregunta.match(/\b(?:m[aá]s|menos|promedio)\b/i) && rows.length < 100 && /(?:cu[aá]ntos?|total|n[uú]mero)/i.test(pregunta)) {
      resultado.visualizacion = { tipo: 'metrica', titulo: /activos?/i.test(pregunta) ? 'Clubes activos' : 'Clubes encontrados', valor: rows.length };
    }
  }
  return resultado;
}
