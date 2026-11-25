import { createHash, randomBytes } from 'node:crypto';
import pool from '../db.js';
import { ROLES_SIN_OTP } from './otp.js';

const DIAS_RECUERDO = 30;
const SEGUNDOS_GRACIA_TOKEN_ANTERIOR = 60;
const FORMATO_ID_DISPOSITIVO = /^[a-f0-9]{64}$/i;
const ROLES_SIN_OTP_VALORES = [...ROLES_SIN_OTP];

export function idDispositivoDesdeReq(req) {
  const id = req.get('x-client-device') || '';
  return FORMATO_ID_DISPOSITIVO.test(id) ? id.toLowerCase() : null;
}

function hash(valor) {
  return createHash('sha256').update(valor).digest('hex');
}

export async function revocarConfianzaDeDispositivo(idDispositivo) {
  if (!FORMATO_ID_DISPOSITIVO.test(idDispositivo || '')) return false;
  const { rowCount } = await pool.query(
    `UPDATE dispositivos_confiables
        SET revocado_en = COALESCE(revocado_en, CURRENT_TIMESTAMP)
      WHERE hash_dispositivo = $1 AND revocado_en IS NULL`,
    [hash(String(idDispositivo).toLowerCase())],
  );
  return rowCount > 0;
}

export async function revocarCuentaEnDispositivo({ idDispositivo, token }) {
  if (!FORMATO_ID_DISPOSITIVO.test(idDispositivo || '') || !FORMATO_ID_DISPOSITIVO.test(token || '')) return false;
  const { rowCount } = await pool.query(
    `UPDATE dispositivos_confiables
        SET revocado_en = COALESCE(revocado_en, CURRENT_TIMESTAMP)
      WHERE hash_dispositivo = $1
        AND (
          token_hash = $2
          OR (
            token_hash_anterior = $2
            AND token_anterior_expira_en > CURRENT_TIMESTAMP
          )
        )
        AND revocado_en IS NULL`,
    [hash(String(idDispositivo).toLowerCase()), hash(String(token).toLowerCase())],
  );
  return rowCount > 0;
}

export async function recordarCuentaEnDispositivo({ idUsuario, idDispositivo }) {
  const token = randomBytes(32).toString('hex');
  const generacion = randomBytes(32).toString('hex');
  const { rows } = await pool.query(
    `INSERT INTO dispositivos_confiables
       (id_usuario, hash_dispositivo, token_hash, generacion, creado_en,
        ultimo_uso, expira_en, revocado_en, token_hash_anterior,
        token_anterior_expira_en)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
             CURRENT_TIMESTAMP + ($5 * INTERVAL '1 day'), NULL, NULL, NULL)
     ON CONFLICT (hash_dispositivo) DO UPDATE SET
       id_usuario = EXCLUDED.id_usuario,
       token_hash = EXCLUDED.token_hash,
       generacion = EXCLUDED.generacion,
       creado_en = CURRENT_TIMESTAMP,
       ultimo_uso = CURRENT_TIMESTAMP,
       expira_en = EXCLUDED.expira_en,
       revocado_en = NULL,
       token_hash_anterior = NULL,
       token_anterior_expira_en = NULL
     RETURNING id_dispositivo, expira_en, generacion`,
    [idUsuario, hash(String(idDispositivo).toLowerCase()), hash(token), generacion, DIAS_RECUERDO],
  );

  return { token, ...rows[0] };
}

export async function renovarCuentaEnDispositivo({ idDispositivo, token }) {
  if (!FORMATO_ID_DISPOSITIVO.test(idDispositivo || '') || !FORMATO_ID_DISPOSITIVO.test(token || '')) return null;

  const tokenNuevo = randomBytes(32).toString('hex');
  const tokenNormalizado = String(token).toLowerCase();
  const { rows } = await pool.query(
    `UPDATE dispositivos_confiables d
        SET token_hash_anterior = d.token_hash,
            token_anterior_expira_en = CURRENT_TIMESTAMP + ($4 * INTERVAL '1 second'),
            token_hash = $3,
            ultimo_uso = CURRENT_TIMESTAMP
       FROM usuarios u
       JOIN cat_roles r ON r.id_rol = u.id_rol
      WHERE d.hash_dispositivo = $1
        AND (
          d.token_hash = $2
          OR (
            d.token_hash_anterior = $2
            AND d.token_anterior_expira_en > CURRENT_TIMESTAMP
          )
        )
        AND d.id_usuario = u.id_usuario
        AND d.generacion IS NOT NULL
        AND u.deleted_at IS NULL
        AND NOT (u.id_rol = ANY($5::int[]))
        AND d.revocado_en IS NULL
        AND d.expira_en > CURRENT_TIMESTAMP
      RETURNING d.id_dispositivo, d.expira_en, d.generacion, u.id_usuario,
                u.nombre_completo, u.correo_institucional,
                u.institutional_id, u.id_rol, r.nombre_rol AS rol,
                u.id_licenciatura`,
    [
      hash(String(idDispositivo).toLowerCase()),
      hash(tokenNormalizado),
      hash(tokenNuevo),
      SEGUNDOS_GRACIA_TOKEN_ANTERIOR,
      ROLES_SIN_OTP_VALORES,
    ],
  );

  if (!rows[0]) return null;
  return { token: tokenNuevo, ...rows[0] };
}
