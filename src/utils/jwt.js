const FORMATO_GENERACION = /^[a-f0-9]{64}$/i;

function decodificarPayloadJwt(token) {
  if (typeof token !== 'string') throw new Error('Token JWT inválido.');

  const segmento = token.split('.')[1];
  if (!segmento || !/^[A-Za-z0-9_-]+={0,2}$/.test(segmento)) {
    throw new Error('Payload JWT inválido.');
  }

  // JWT usa base64url: normalizamos el alfabeto y reconstruimos el padding.
  const base64 = segmento
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/=+$/, '');
  if (base64.length % 4 === 1) throw new Error('Padding JWT inválido.');

  const conPadding = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binario = atob(conPadding);
  const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
  const texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  return JSON.parse(texto);
}

function expiracionEnMilisegundos(payload) {
  const exp = Number(payload?.exp);
  return Number.isFinite(exp) ? exp * 1000 : null;
}

export function jwtExpirado(token) {
  try {
    const expiraEn = expiracionEnMilisegundos(decodificarPayloadJwt(token));
    return expiraEn === null || expiraEn <= Date.now();
  } catch {
    return true;
  }
}

export function jwtVencePronto(token) {
  try {
    const expiraEn = expiracionEnMilisegundos(decodificarPayloadJwt(token));
    return expiraEn === null || expiraEn <= Date.now() + 3 * 60 * 1000;
  } catch {
    return true;
  }
}

// El backend rechaza de forma fail-closed los JWT confiables emitidos antes de
// la generación. El cliente intenta sustituirlos de inmediato, sin esperar a exp.
export function jwtRequiereRenovacion(token) {
  try {
    const payload = decodificarPayloadJwt(token);
    if (payload?.id_dispositivo_confiable == null) return false;
    return !FORMATO_GENERACION.test(payload.generacion_dispositivo_confiable || '');
  } catch {
    return false;
  }
}
