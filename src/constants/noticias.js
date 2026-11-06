/* Estados, etiquetas y permisos del módulo de Noticias / Periódico Mural.
   PBI-16 (rol responsable_mural) y PBI-17 (flujo de aprobación previa).

   Es la única fuente de verdad de la UI: tablas, tarjetas, filtros y el feed
   público leen de aquí, nunca literales sueltos. El backend replica estas
   reglas en `backend/routes/noticias.js` (grep por ESTADOS_NOTICIA), y la base
   las garantiza con `chk_noticia_status`.

   Tipado: JSDoc con `// @ts-check` en cada consumidor que lo necesite. */

/**
 * Estados del flujo de aprobación previa de publicaciones.
 *
 * draft     → Borrador: el redactor aún puede editar.
 * pending   → Pendiente de aprobación: en manos de rectoría.
 * published → Publicada: única visible en el feed público.
 * rejected  → Rechazada: vuelve a su autor con `motivo_rechazo`.
 *
 * @typedef {'draft'|'pending'|'published'|'rejected'} EstadoNoticia
 */

/** @type {readonly EstadoNoticia[]} */
export const ESTADOS_NOTICIA = ['draft', 'pending', 'published', 'rejected'];

/** Nombre visible de cada estado. */
export const ETIQUETAS_ESTADO = {
  draft: 'Borrador',
  pending: 'Pendiente de aprobación',
  published: 'Publicada',
  rejected: 'Rechazada',
};

/** Versión corta, para badges y pestañas con poco espacio. */
export const ETIQUETAS_CORTAS_ESTADO = {
  draft: 'Borrador',
  pending: 'Pendiente',
  published: 'Publicada',
  rejected: 'Rechazada',
};

/** Texto de ayuda que explica qué pasa en cada estado. */
export const DESCRIPCIONES_ESTADO = {
  draft: 'Sólo tú y los editores lo ven. Envíalo a revisión cuando esté listo.',
  pending: 'Rectoría está validando la información antes de publicarla.',
  published: 'Visible en el periódico mural para toda la comunidad.',
  rejected: 'Rectoría lo devolvió. Revisa el motivo, corrige y vuelve a enviarlo.',
};

/** Color del badge de cada estado (clases del kit `Badge`). */
export const COLORES_ESTADO = {
  draft: 'slate',
  pending: 'amber',
  published: 'emerald',
  rejected: 'red',
};

/** Pestañas del listado administrativo, en orden de flujo de trabajo. */
export const FILTROS_ESTADO = [
  { valor: 'todos', etiqueta: 'Todas' },
  { valor: 'pending', etiqueta: 'Pendientes de Aprobar' },
  { valor: 'draft', etiqueta: 'Borradores' },
  { valor: 'rejected', etiqueta: 'Rechazadas' },
  { valor: 'published', etiqueta: 'Publicadas' },
];

/* ------------------------------------------------------------
   Roles (ids de `cat_roles`)
   ------------------------------------------------------------ */

export const ROL_ALUMNO = 1;
export const ROL_ADMIN = 3;
export const ROL_RECTORIA = 4;
export const ROL_RESPONSABLE_MURAL = 6;
export const ROL_COORDINACION = 7;

/** Máximo de caracteres del contenido de una noticia (coincide con el backend). */
export const LIMITE_CONTENIDO_NOTICIA = 2000;

/** Puede redactar y gestionar el periódico mural (PBI-16). Coordinación tiene los permisos de admin, excepto cambiar el estado. */
export function esEditorNoticias(idRol) {
  return idRol === ROL_ADMIN || idRol === ROL_RECTORIA || idRol === ROL_RESPONSABLE_MURAL || idRol === ROL_COORDINACION;
}

/** Única autoridad que publica, rechaza u oculta (PBI-17). */
export function esAprobadorNoticias(idRol) {
  return idRol === ROL_RECTORIA;
}

/** Ve sólo sus propias noticias en el listado administrativo. */
export function esRolResponsableMural(idRol) {
  return idRol === ROL_RESPONSABLE_MURAL;
}

/**
 * Acciones que un rol puede ejecutar sobre una noticia en un estado dado.
 * El backend vuelve a validar todo esto: es sólo para decidir qué botones
 * se renderizan.
 *
 * @param {EstadoNoticia} estado
 * @param {number} idRol
 */
export function accionesNoticia(estado, idRol) {
  const aprobador = esAprobadorNoticias(idRol);
  const editor = esEditorNoticias(idRol);

  return {
    // Admin edita en cualquier estado; coordinación en todos menos publicada;
    // el responsable del mural sólo en borrador o rechazada.
    editar: editor && !aprobador && (
      idRol === ROL_ADMIN ||
      (idRol === ROL_COORDINACION && estado !== 'published') ||
      estado === 'draft' || estado === 'rejected'
    ),
    editarCualquiera: aprobador,
    enviarRevision: editor && (estado === 'draft' || estado === 'rejected'),
    // Eliminar: rectoría/admin/coordinación pueden eliminar en cualquier estado;
    // el responsable del mural sólo sus borradores o rechazadas (el backend lo
    // revalida en DELETE /:id).
    eliminar: editor && (aprobador || idRol === ROL_ADMIN || idRol === ROL_COORDINACION || estado === 'draft' || estado === 'rejected'),
    // Rectoría:
    aprobar: aprobador && estado === 'pending',
    rechazar: aprobador && estado === 'pending',
    ocultar: aprobador && estado === 'published',
  };
}

/* ------------------------------------------------------------
   Vista pública
   ------------------------------------------------------------ */

/**
 * Lo único que puede verse fuera de los paneles: publicadas. Se aplica en el
 * feed, en el popup de portada y en el feed móvil, además del filtro en SQL.
 *
 * @param {{ status?: string, publicada?: boolean }} noticia
 * @returns {boolean}
 */
export function esPublicable(noticia) {
  if (!noticia) return false;
  if (noticia.status) return noticia.status === 'published';
  // Respuesta de una API anterior a `status`: cae en la bandera clásica.
  return noticia.publicada === true;
}

/**
 * @param {Array<{ status?: string, publicada?: boolean }>} lista
 * @returns {Array<{ status?: string, publicada?: boolean }>}
 */
export function filtrarPublicadas(lista) {
  return Array.isArray(lista) ? lista.filter(esPublicable) : [];
}
