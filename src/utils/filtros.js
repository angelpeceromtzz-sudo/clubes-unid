/* Funciones reutilizables de filtrado para listas del panel admin. */

export function filtrarUsuarios(usuarios, busqueda = '', filtroRol = '') {
  const q = busqueda.toLowerCase().trim();
  const porRol = filtroRol ? usuarios.filter((u) => String(u.id_rol) === filtroRol) : usuarios;
  return q
    ? porRol.filter(
        (u) =>
          String(u.id_usuario).includes(q) ||
          u.nombre_completo.toLowerCase().includes(q) ||
          u.correo_institucional.toLowerCase().includes(q)
      )
    : porRol;
}

export function filtrarClubes(clubes, busqueda = '') {
  const q = busqueda.toLowerCase().trim();
  return q
    ? clubes.filter(
        (c) =>
          c.nombre_club.toLowerCase().includes(q) ||
          (c.categoria && c.categoria.toLowerCase().includes(q))
      )
    : clubes;
}

export function filtrarPorTexto(items, busqueda = '', campos = []) {
  const q = busqueda.toLowerCase().trim();
  if (!q) return items;
  return items.filter((item) =>
    campos.some((campo) => String(item[campo] ?? '').toLowerCase().includes(q))
  );
}
