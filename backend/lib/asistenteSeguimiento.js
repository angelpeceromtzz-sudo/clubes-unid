export function usarContextoPrevio(pregunta, contexto, decision) {
  if (!contexto) return false;
  if (decision.busqueda?.trim() && decision.busqueda.trim().toLocaleLowerCase('es') !== contexto.nombre.toLocaleLowerCase('es')) return false;
  if (decision.usar_contexto === true) return true;
  const referencia = /\b(?:y\s+)?(?:ese|esa|este|esta|su|sus|él|ella|ellos|ellas)\b|\b(?:del|de la)\s+(?:club|actividad|persona)\b|^\s*¿?\s*y\b|\b(?:tiene|tenía)\s*\?/i.test(pregunta);
  const entidadNueva = /\b(?:club|actividad)\s+(?:de|del|llamad[oa])\s+[A-ZÁÉÍÓÚ]|\b[A-ZÁÉÍÓÚ][a-záéíóú]+\s+[A-ZÁÉÍÓÚ][a-záéíóú]+\b/u.test(pregunta);
  return referencia && !entidadNueva && !decision.busqueda?.trim();
}

export function respuestaComparacion(tipo, rows, pregunta) {
  if (!rows.length || !/(?:qu[eé]|cu[aá]l|mayor|menor)/i.test(pregunta)) return null;
  const ascendente = /\b(?:menos|menor)\b/i.test(pregunta);
  if (!ascendente && !/\b(?:m[aá]s|mayor)\b/i.test(pregunta)) return null;
  const campo = tipo === 'clubes_estadisticas' ? 'miembros_activos'
    : tipo === 'actividades_estadisticas' ? /asisten/i.test(pregunta) ? 'asistencias' : /edicion/i.test(pregunta) ? 'ediciones' : 'registros_confirmados'
      : null;
  if (!campo) return null;
  const ordenadas = [...rows].sort((a, b) => (ascendente ? a[campo] - b[campo] : b[campo] - a[campo]) || a.nombre_club.localeCompare(b.nombre_club));
  const empate = ordenadas.filter(row => row[campo] === ordenadas[0][campo]);
  const unidad = { miembros_activos: 'miembros activos', asistencias: 'asistencias', ediciones: 'ediciones', registros_confirmados: 'registros confirmados' }[campo];
  const sujeto = tipo === 'clubes_estadisticas' ? 'club' : 'actividad';
  const nombres = empate.map(row => row.nombre_club).join(', ');
  return `${empate.length === 1 ? `El ${sujeto} con ${ascendente ? 'menos' : 'más'} ${unidad} es ${nombres}` : `Hay un empate entre ${nombres}`} (${ordenadas[0][campo]} ${unidad}).`;
}
