// Adaptación entre el contrato del backend (GET /api/me/preferencias) y el
// estado editable del formulario del perfil. Sin React ni red. El filtro de
// actividades mantiene solo las que pertenecen a categorías seleccionadas, para
// que una deselección previa no deje actividades huérfanas.

export function adaptarPreferenciasServidor(datos, actividadesCatalogo = []) {
  const mapa = new Map(actividadesCatalogo.map((actividad) => [actividad.id, actividad.id_categoria]));
  const categorias = [...(datos?.categorias ?? [])];
  const actividades = [...(datos?.actividades ?? [])].filter((id) => mapa.size === 0 || categorias.includes(mapa.get(id)));
  return {
    categorias,
    actividades,
    motivaciones: [...(datos?.motivaciones ?? [])],
    genero: datos?.genero ?? null,
    correo: {
      ...(datos?.correo ?? { activo: false, frecuencia: 'inmediata', tipos: {} }),
      decision: (datos?.correo?.activo === true) ? 'aceptar' : 'rechazar',
    },
    propuesta: '',
  };
}


