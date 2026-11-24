import { obtenerIdDispositivo, request } from './api-core';

function encabezadoDispositivo() {
  const dispositivo = obtenerIdDispositivo();
  return dispositivo ? { 'X-Client-Device': dispositivo } : {};
}

export const autenticacionService = {
  login: (correo, contrasena) =>
    request('/auth/login-local', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
      headers: encabezadoDispositivo(),
    }),

  loginMicrosoft: (accessToken) =>
    request('/auth/login-microsoft', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
      headers: encabezadoDispositivo(),
    }),

  solicitarOtp: (correo) =>
    request('/auth/otp/solicitar', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    }),

  verificarOtp: (correo, codigo, nombre, recordarCuenta = false) =>
    request('/auth/otp/verificar', {
      method: 'POST',
      body: JSON.stringify({ correo, codigo, recordar_cuenta: recordarCuenta, ...(nombre ? { nombre } : {}) }),
      headers: encabezadoDispositivo(),
    }),

  getMe: () => request('/auth/me'),
};
