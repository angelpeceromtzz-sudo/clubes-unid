// Verificación de secretos al arrancar (T-034). No imprime valores, solo nombres.
// Fail-closed para lo imprescindible; advertencias para lo recomendable.

const PLACEHOLDERS_ADMIN = new Set([
  '',
  'tu_admin_secret',
  'admin_secret',
  'tu-admin-secret',
]);

export function verificarSecretosArranque() {
  const errores = [];
  const avisos = [];

  if (!process.env.JWT_SECRET) {
    errores.push('JWT_SECRET no está definido');
  } else if (process.env.JWT_SECRET.length < 32) {
    avisos.push('JWT_SECRET tiene menos de 32 caracteres');
  }

  if (process.env.AUTH_OTP_ENABLED === 'true') {
    if (!process.env.OTP_PEPPER) {
      errores.push('OTP_PEPPER es obligatorio cuando AUTH_OTP_ENABLED=true');
    }
    const proveedor = process.env.OTP_MAIL_PROVIDER || 'mock';
    if (!['mock', 'resend', 'smtp'].includes(proveedor)) {
      errores.push(`OTP_MAIL_PROVIDER no válido: ${proveedor}`);
    }
    if (proveedor === 'resend' && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)) {
      avisos.push('RESEND_API_KEY/RESEND_FROM vacíos con OTP_MAIL_PROVIDER=resend');
    }
  }

  if (process.env.NODE_ENV === 'production') {
    if (PLACEHOLDERS_ADMIN.has((process.env.ADMIN_SECRET || '').trim().toLowerCase())) {
      avisos.push('ADMIN_SECRET vacío o con valor por defecto en producción');
    }
    if (!process.env.CORS_ORIGIN) {
      avisos.push('CORS_ORIGIN no definido en producción (se usará localhost)');
    }
  }

  for (const e of errores) {
    console.error(`FATAL (secretos): ${e}`);
  }
  for (const a of avisos) {
    console.warn(`ADVERTENCIA (secretos): ${a}`);
  }

  if (errores.length > 0) {
    process.exit(1);
  }
}