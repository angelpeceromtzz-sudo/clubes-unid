export const tieneRevisionPendiente = (entidad) =>
  entidad.estado === 'pendiente' || entidad.estado_propuesta === 'pendiente';

export function filtrarCatalogoGestion(actividades, ediciones, tipo, estado) {
  const actividadesConEdicionesPendientes = new Set(
    ediciones.filter(tieneRevisionPendiente).map((edicion) => edicion.id_actividad),
  );
  return actividades.filter((actividad) =>
    (tipo === 'todos' || actividad.tipo === tipo)
    && (estado === 'todos'
      || (actividad.estado_propuesta || actividad.estado) === estado
      || (estado === 'pendiente' && actividadesConEdicionesPendientes.has(actividad.id_actividad))),
  );
}

export function seleccionarEdicionGestion(ediciones, idSeleccionado, priorizarPendientes) {
  return ediciones.find((edicion) => edicion.id_edicion === idSeleccionado)
    || (priorizarPendientes && ediciones.find(tieneRevisionPendiente))
    || ediciones[0];
}
