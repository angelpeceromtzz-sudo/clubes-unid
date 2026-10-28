export function etiquetaResponsable(club) {
  const categoria = String(club?.categoria || '').trim().toLowerCase();
  if (categoria === 'deportes') return 'Entrenador';
  if (categoria === 'cultura') return 'Instructor';
  if (categoria === 'tecnología' || categoria === 'tecnologia') return 'Coordinador';
  return 'Responsable del club';
}
