import { getToken, API_BASE } from './api-core';

export const uploadService = {
  uploadImagen: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('imagen', file);
    const res = await fetch(`${API_BASE}/upload/imagen`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al subir imagen' }));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return res.json();
  },
};
