const BASE_BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export function obtenerUrlImagen(path) {
  if (!path) return null;
  if (path.startsWith('/uploads/')) {
    return `${BASE_BACKEND}${path}`;
  }
  return path;
}
