const roles = [
  { id: 1, nombre: 'alumno', patron: /\balumn(?:o|a)s?\b|\bestudiantes?\b/ },
  { id: 2, nombre: 'responsable de club', patron: /\b(?:responsables? (?:de|del) club|presidentes? (?:de|del) club)\b/ },
  { id: 3, nombre: 'administrador', patron: /\badministrador(?:es|as)?\b|\badmins?\b/ },
  { id: 4, nombre: 'rectoría', patron: /\brectoria\b|\brector(?:es|as)?\b/ },
  { id: 5, nombre: 'vicepresidente', patron: /\bvicepresident(?:e|es|a|as)\b/ },
  { id: 6, nombre: 'responsable del mural', patron: /\bmural\b/ },
  { id: 7, nombre: 'coordinación', patron: /\bcoordinacion\b|\bcoordinador(?:es|as)?\b/ },
];

export function detectarConsultaPersonasPorRol(pregunta) {
  const texto = pregunta.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!/\b(?:quien(?:es)?|cuales|lista|listar|nombres?|muestrame|dime|identifica)\b/.test(texto)) return null;
  if (/\b(?:cuantos?|numero|total|cantidad)\b/.test(texto)) return null;
  return roles.find(rol => rol.patron.test(texto)) || null;
}
