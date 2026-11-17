import pool from '../db.js';

// Repositorio del flujo OTP. Se expone como objeto para que las pruebas puedan
// sustituir sus métodos sin tocar las rutas ni la conexión real a PostgreSQL.
export function crearOtpStore(db = pool) {
  return {
    async invalidarYGuardar({
      correo,
      codigoHash,
      expiraEn,
      maxIntentos,
      ip,
      userAgent,
    }) {
      // Upsert atómico sobre el único código activo por correo (índice parcial
      // uq_otp_codigo_activo_por_correo). Si dos solicitudes concurrentes llegan
      // a la vez, la segunda actualiza el registro en vez de dejar dos códigos
      // activos o provocar un 500 por violación de unicidad.
      const { rows } = await db.query(
        `INSERT INTO otp_codigos
           (correo_institucional, codigo_hash, expira_en, intentos, max_intentos, ip_solicitud, user_agent)
         VALUES ($1, $2, $3, 0, $4, $5, $6)
         ON CONFLICT (correo_institucional) WHERE consumido_en IS NULL
         DO UPDATE SET
           codigo_hash = EXCLUDED.codigo_hash,
           expira_en = EXCLUDED.expira_en,
           intentos = 0,
           max_intentos = EXCLUDED.max_intentos,
           consumido_en = NULL,
           creado_en = CURRENT_TIMESTAMP,
           ip_solicitud = EXCLUDED.ip_solicitud,
           user_agent = EXCLUDED.user_agent
         RETURNING id_otp`,
        [correo, codigoHash, expiraEn, maxIntentos, ip, userAgent],
      );

      return rows[0] || null;
    },

    async buscarCodigoActivo({ correo }) {
      const { rows } = await db.query(
        `SELECT id_otp, codigo_hash, expira_en, intentos, max_intentos
           FROM otp_codigos
          WHERE correo_institucional = $1
            AND consumido_en IS NULL
          ORDER BY creado_en DESC, id_otp DESC
          LIMIT 1`,
        [correo],
      );

      return rows[0] || null;
    },

    async registrarIntentoFallido({ idOtp, codigoHash }) {
      const { rows } = await db.query(
        `UPDATE otp_codigos
            SET intentos = intentos + 1,
                consumido_en = CASE
                  WHEN intentos + 1 >= max_intentos THEN CURRENT_TIMESTAMP
                  ELSE consumido_en
                END
          WHERE id_otp = $1
            AND codigo_hash = $2
            AND consumido_en IS NULL
          RETURNING id_otp, intentos, max_intentos, consumido_en`,
        [idOtp, codigoHash],
      );

      return rows[0] || null;
    },

    async consumirCodigo({ idOtp, codigoHash }) {
      const { rows } = await db.query(
        `UPDATE otp_codigos
            SET consumido_en = CURRENT_TIMESTAMP
          WHERE id_otp = $1
            AND codigo_hash = $2
            AND consumido_en IS NULL
            AND expira_en > CURRENT_TIMESTAMP
            AND intentos < max_intentos
          RETURNING id_otp`,
        [idOtp, codigoHash],
      );

      return rows[0] || null;
    },

    async marcarConsumido({ idOtp, codigoHash }) {
      await db.query(
        `UPDATE otp_codigos
            SET consumido_en = COALESCE(consumido_en, CURRENT_TIMESTAMP)
          WHERE id_otp = $1
            AND codigo_hash = $2`,
        [idOtp, codigoHash],
      );
    },

    async buscarUsuario({ correo }) {
      const { rows } = await db.query(
        `SELECT u.id_usuario, u.nombre_completo, u.correo_institucional,
                u.institutional_id, u.id_rol, u.deleted_at,
                r.nombre_rol AS rol
           FROM usuarios u
           JOIN cat_roles r ON r.id_rol = u.id_rol
          WHERE LOWER(u.correo_institucional) = $1
          LIMIT 1`,
        [correo],
      );

      return rows[0] || null;
    },

    async crearUsuarioOtp({ correo, nombre }) {
      const { rows } = await db.query(
        `WITH nuevo AS (
           INSERT INTO usuarios
             (nombre_completo, correo_institucional, id_rol, last_login)
           VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
           ON CONFLICT (correo_institucional) DO NOTHING
           RETURNING id_usuario, nombre_completo, correo_institucional,
                     institutional_id, id_rol
         )
         SELECT n.id_usuario, n.nombre_completo, n.correo_institucional,
                n.institutional_id, n.id_rol, r.nombre_rol AS rol
           FROM nuevo n
           JOIN cat_roles r ON r.id_rol = n.id_rol`,
        [nombre, correo],
      );

      return rows[0] || null;
    },

    async actualizarLastLogin({ idUsuario }) {
      await db.query(
        `UPDATE usuarios
            SET last_login = CURRENT_TIMESTAMP
          WHERE id_usuario = $1
            AND deleted_at IS NULL`,
        [idUsuario],
      );
    },

    async limpiarExpirados({ horas = 24 } = {}) {
      await db.query(
        `DELETE FROM otp_codigos
          WHERE creado_en < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 hour')`,
        [horas],
      );
    },
  };
}

export const otpStore = crearOtpStore();
