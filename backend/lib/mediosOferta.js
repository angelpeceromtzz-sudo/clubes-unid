export async function guardarPublicacionFotos(db, { idRecurso, idEdicion = null, pie, idAutor, publicada, archivos }) {
  const publicacion = (await db.query('INSERT INTO publicaciones_oferta(id_club,id_edicion,contenido,id_autor) VALUES($1,$2,$3,$4) RETURNING id_publicacion', [idRecurso,idEdicion,pie,idAutor])).rows[0];
  const ids = [];
  for (const [orden, archivo] of archivos.entries()) {
    const fila = (await db.query('INSERT INTO publicaciones_imagenes(id_publicacion,url_imagen,estado,orden,public_id) VALUES($1,$2,$3,$4,$5) RETURNING id_foto', [publicacion.id_publicacion,archivo.path,publicada ? 'publicada' : 'pendiente',orden,archivo.filename || null])).rows[0];
    ids.push(fila.id_foto);
  }
  return (await db.query('SELECT * FROM actividades_fotos WHERE id_foto=ANY($1::int[]) ORDER BY orden,id_foto', [ids])).rows;
}
