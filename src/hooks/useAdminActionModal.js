/* Hook para modal de promoción/ degradación de administradores. */
import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useAdminActionModal() {
  const [modalAdmin, setModalAdmin] = useState({ show: false, targetUser: null, accion: '' });
  const [enviandoAdmin, setEnviandoAdmin] = useState(false);
  const [errorAdmin, setErrorAdmin] = useState('');

  const abrirModalAdmin = useCallback((user, accion) => {
    setModalAdmin({ show: true, targetUser: user, accion });
    setErrorAdmin('');
  }, []);

  const manejarAdminAction = useCallback(async (password, onSuccess) => {
    const { targetUser, accion } = modalAdmin;
    setEnviandoAdmin(true);
    setErrorAdmin('');
    try {
      await api.adminAction(targetUser.id_usuario, accion, password);
      await onSuccess(targetUser, accion);
      setModalAdmin({ show: false, targetUser: null, accion: '' });
    } catch (err) {
      setErrorAdmin(err.message);
    } finally {
      setEnviandoAdmin(false);
    }
  }, [modalAdmin]);

  const cerrarModalAdmin = useCallback(() => {
    setModalAdmin({ show: false, targetUser: null, accion: '' });
    setErrorAdmin('');
  }, []);

  return { modalAdmin, enviandoAdmin, errorAdmin, abrirModalAdmin, manejarAdminAction, cerrarModalAdmin };
}
