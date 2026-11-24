import { createHash, randomBytes } from 'node:crypto';
import pool from '../db.js';

const DIAS_RECUERDO = 30;
const FORMATO_ID_DISPOSITIVO = /^[a-f0-9]{64}$/i;

export function idDispositivoDesdeReq(req) {
  const id = req.get('x-client-device') || '';
  return FORMATO_ID_DISPOSITIVO.test(id) ? id.toLowerCase() : null;
}

function hash(valor) {
  return createHash('sha256').update(valor).digest('hex');
}

export async function revocarConfianzaDeDispositivo(idDispositivo) {
  if (!idDispositivo) return false;
  const { rowCount } = await pool.query(
    `UPDATE dispositivos_confiables
        SET revocado_en = COALESCE(revocado_en, CURRENT_TIMESTAMP)
      WHERE hash_dispositivo = $1 AND revocado_en IS NULL`,
    [hash(idDispositivo)],
  );
  return rowCount > 0;
}

export async function revocarCuentaEnDispositivo({ idDispositivo, token }) {
  if (!FORMATO_ID_DISPOSITIVO.test(idDispositivo || '') || !FORMATO_ID_DISPOSITIVO.test(token || '')) return false;
  const { rowCount } = await pool.query(
    `UPDATE dispositivos_confiables
        SET revocado_en = COALESCE(revocado_en, CURRENT_TIMESTAMP)
      WHERE hash_dispositivo = $1
        AND token_hash = $2
        AND revocado_en IS NULL`,
    [hash(idDispositivo), hash(token)],
  );
  return rowCount > 0;
}

export async function recordarCuentaEnDispositivo({ idUsuario, idDispositivo }) {
  const token = randomBytes(32).toString('hex');
  const { rows } = await pool.query(
    `INSERT INTO dispositivos_confiables
       (id_usuario, hash_dispositivo, token_hash, creado_en, ultimo_uso, expira_en, revocado_en)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
             CURRENT_TIMESTAMP + ($4 * INTERVAL '1 day'), NULL)
     ON CONFLICT (hash_dispositivo) DO UPDATE SET
       id_usuario = EXCLUDED.id_usuario,
       token_hash = EXCLUDED.token_hash,
       creado_en = CURRENT_TIMESTAMP,
       ultimo_uso = CURRENT_TIMESTAMP,
       expira_en = EXCLUDED.expira_en,
       revocado_en = NULL
     RETURNING id_dispositivo, expira_en`,
    [idUsuario, hash(idDispositivo), hash(token), DIAS_RECUERDO],
  );

  return { token, ...rows[0] };
}

export async function renovarCuentaEnDispositivo({ idDispositivo, token }) {
  if (!FORMATO_ID_DISPOSITIVO.test(idDispositivo || '') || !FORMATO_ID_DISPOSITIVO.test(token || '')) return null;

  const tokenNuevo = randomBytes(32).toString('hex');
  const { rows } = await pool.query(
    `UPDATE dispositivos_confiables d
        SET token_hash = $3,
            ultimo_uso = CURRENT_TIMESTAMP
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
      WHERE d.hash_dispositivo = $1
        AND d.token_hash = $2
        AND d.id_usuario = u.id_usuario
        AND u.deleted_at IS NULL
        AND d.revocado_en IS NULL
        AND d.expira_en > CURRENT_TIMESTAMP
     RETURNING d.id_dispositivo, d.expira_en, u.id_usuario, u.nombre_completo,
               u.correo_institucional, u.institutional_id, u.id_rol, r.nombre_rol AS rol,
               u.id_licenciatura`,
    [hash(idDispositivo), hash(token), hash(tokenNuevo)],
  );

  if (!rows[0]) return null;
  return { token: tokenNuevo, ...rows[0] };
}

