import { request } from './api-core';

export const autenticacionService = {
  login: (correo, contrasena) =>
    request('/auth/login-local', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
    }),

  loginMicrosoft: (accessToken) =>
    request('/auth/login-microsoft', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),

  solicitarOtp: (correo) =>
    request('/auth/otp/solicitar', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    }),

  verificarOtp: (correo, codigo, nombre) =>
    request('/auth/otp/verificar', {
      method: 'POST',
      body: JSON.stringify({ correo, codigo, ...(nombre ? { nombre } : {}) }),
    }),

  getMe: () => request('/auth/me'),
};
