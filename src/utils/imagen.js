const BASE_BACKEND = 'https://clubes-unid.onrender.com';

export function obtenerUrlImagen(path) {
  if (!path) return null;
  if (path.startsWith('/uploads/')) {
    return `${BASE_BACKEND}${path}`;
  }
  return path;
}
