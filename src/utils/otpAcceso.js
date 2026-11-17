export const DOMINIOS_OTP = Object.freeze(['red.unid.mx', 'unid.mx']);
export const LARGO_CODIGO_OTP = 6;
export const SEGUNDOS_REENVIO_OTP = 60;

export function esOtpHabilitado(valor) {
  return String(valor ?? '').trim().toLowerCase() === 'true';
}

export function normalizarCorreoOtp(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

export function esCorreoOtpValido(valor) {
  const correo = normalizarCorreoOtp(valor);

  if (!correo || correo.length > 100 || /\s/.test(correo)) {
    return false;
  }

  const arroba = correo.indexOf('@');
  if (arroba <= 0 || arroba !== correo.lastIndexOf('@')) {
    return false;
  }

  const local = correo.slice(0, arroba);
  const dominio = correo.slice(arroba + 1);

  return local.length > 0 && local.length <= 64 && DOMINIOS_OTP.includes(dominio);
}

export function normalizarCodigoOtp(valor) {
  return String(valor ?? '').replace(/\D/g, '').slice(0, LARGO_CODIGO_OTP);
}

export function esCodigoOtpValido(valor) {
  return new RegExp(`^\\d{${LARGO_CODIGO_OTP}}$`).test(String(valor ?? ''));
}

export function segundosDeEsperaOtp(error) {
  const segundos = Number(error?.reintentarEnSegundos);

  return Number.isFinite(segundos) && segundos > 0 ? Math.ceil(segundos) : 0;
}

export function formatearEsperaOtp(segundos) {
  const total = Math.max(0, Math.ceil(Number(segundos) || 0));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;

  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

export function mensajeErrorOtp(error, contexto = 'solicitar') {
  const status = Number(error?.status);
  const espera = segundosDeEsperaOtp(error);

  if (status === 429) {
    if (espera > 0) {
      return `Demasiadas solicitudes. Vuelve a intentarlo en ${formatearEsperaOtp(espera)}.`;
    }

    return 'Demasiadas solicitudes. Espera unos minutos antes de volver a intentarlo.';
  }

  if (status === 503) {
    return 'El acceso con código no está disponible temporalmente. Intenta más tarde.';
  }

  if (status === 401) {
    return contexto === 'verificar'
      ? 'El código es incorrecto o expiró. Solicita uno nuevo.'
      : 'No se pudo enviar el código. Intenta de nuevo.';
  }

  if (status === 400) {
    return contexto === 'verificar'
      ? 'El código no es válido. Revisa que tenga 6 dígitos.'
      : 'Revisa tu correo institucional e intenta de nuevo.';
  }

  if (status === 0) {
    return error?.message || 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';
  }

  return contexto === 'verificar'
    ? 'No se pudo verificar el código. Intenta de nuevo.'
    : 'No se pudo enviar el código. Intenta de nuevo.';
}
