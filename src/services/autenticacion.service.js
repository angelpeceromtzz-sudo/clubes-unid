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

  getMe: () => request('/auth/me'),
};
