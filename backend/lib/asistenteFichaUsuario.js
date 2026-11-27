import pool from '../db.js';
import { obtenerDatosAlumno } from './asistenteExpediente.js';

export async function obtenerFichaUsuario(usuario) {
  const base = {
    id: usuario.id_usuario,
    nombre: usuario.nombre_completo,
    rol: usuario.rol,
    cuenta_activa: usuario.cuenta_activa,
    correo: usuario.correo_institucional,
  };
  if (usuario.id_rol === 1) {
    return { ...base, expediente: await obtenerDatosAlumno(usuario.id_usuario) };
  }
  const clubes = await pool.query(`SELECT nombre_club, CASE WHEN id_responsable_club = $1 THEN 'responsable' ELSE 'vicepresidente' END AS relacion FROM clubes WHERE id_responsable_club = $1 OR id_vicepresidente = $1 ORDER BY nombre_club LIMIT 30`, [usuario.id_usuario]);
  return { ...base, clubes_a_cargo: clubes.rows };
}
