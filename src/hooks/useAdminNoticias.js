/* Hook de gestión de noticias para los paneles de admin y rectoría. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useConfirmacionPendiente } from './useConfirmacionPendiente';
import { filtrarPorTexto } from '../utils/filtros';

const FORMULARIO_VACIO = {
  titulo: '',
  contenido: '',
  url_imagen: '',
  destacada: false,
  publicada: true,
  tipo: 'noticia',
  fecha_evento: '',
  hora_evento: '',
  lugar_evento: '',
};

export function useAdminNoticias(setFeedback, setErrorFeedback) {
  const [noticias, setNoticias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [cargando, setCargando] = useState(true);

  const { pendiente: pendienteConfirmacion, solicitar: solicitarConfirmacion, confirmar: confirmarPendienteBase, cancelar: cancelarPendiente } = useConfirmacionPendiente();

  useEffect(() => {
    api.getNoticiasAdmin()
      .then(setNoticias)
      .catch(() => setNoticias([]))
      .finally(() => setCargando(false));
  }, []);

  const noticiasFiltradas = filtrarPorTexto(noticias, busqueda, ['titulo', 'contenido']);

  const refetch = useCallback(async () => {
    try {
      const actualizadas = await api.getNoticiasAdmin();
      setNoticias(actualizadas);
    } catch {
      // silently fail
    }
  }, []);

  const abrirModalCrear = useCallback((tipo = 'noticia') => {
    setForm({ ...FORMULARIO_VACIO, tipo });
    setEditando(null);
    setErrorModal('');
    setShowModal(true);
  }, []);

  const abrirModalEditar = useCallback((noticia) => {
    setForm({
      titulo: noticia.titulo || '',
      contenido: noticia.contenido || '',
      url_imagen: noticia.url_imagen || '',
      destacada: noticia.destacada === true,
      publicada: noticia.publicada === true,
      tipo: noticia.tipo || 'noticia',
      fecha_evento: noticia.fecha_evento ? String(noticia.fecha_evento).slice(0, 10) : '',
      hora_evento: noticia.hora_evento ? String(noticia.hora_evento).slice(0, 5) : '',
      lugar_evento: noticia.lugar_evento || '',
    });
    setEditando(noticia);
    setErrorModal('');
    setShowModal(true);
  }, []);

  const cerrarModal = useCallback(() => setShowModal(false), []);

  const togglePublicada = useCallback(async (noticia) => {
    try {
      await api.updateNoticia(noticia.id_noticia, { publicada: !noticia.publicada });
      await refetch();
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [refetch, setErrorFeedback]);

  const eliminar = useCallback((noticia) => {
    solicitarConfirmacion(noticia);
  }, [solicitarConfirmacion]);

  const subirImagen = useCallback(async (file) => {
    try {
      const result = await api.uploadImagen(file);
      setForm((prev) => ({ ...prev, url_imagen: result.url }));
    } catch (err) {
      setErrorModal(err.message);
    }
  }, []);

  const guardar = useCallback(async (e) => {
    e.preventDefault();
    setErrorModal('');
    if (!form.titulo.trim()) {
      setErrorModal('El título es obligatorio');
      return;
    }
    if (!form.contenido.trim()) {
      setErrorModal('El contenido es obligatorio');
      return;
    }
    setEnviando(true);
    try {
      const payload = {
        titulo: form.titulo,
        contenido: form.contenido,
        url_imagen: form.url_imagen || null,
        destacada: form.destacada,
        publicada: form.publicada,
        tipo: form.tipo,
        fecha_evento: form.tipo === 'evento' ? form.fecha_evento || null : null,
        hora_evento: form.tipo === 'evento' ? form.hora_evento || null : null,
        lugar_evento: form.tipo === 'evento' ? form.lugar_evento : null,
      };
      if (editando) {
        await api.updateNoticia(editando.id_noticia, payload);
        setFeedback('Noticia actualizada correctamente');
      } else {
        await api.createNoticia(payload);
        setFeedback('Noticia publicada correctamente');
      }
      await refetch();
      setShowModal(false);
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setEnviando(false);
    }
  }, [form, editando, refetch, setFeedback]);

  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const confirmarPendiente = useCallback(async () => {
    try {
      await confirmarPendienteBase(async (n) => {
        await api.deleteNoticia(n.id_noticia);
        setFeedback('Noticia eliminada correctamente');
        await refetch();
      });
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [confirmarPendienteBase, refetch, setFeedback, setErrorFeedback]);

  return {
    noticias,
    noticiasFiltradas,
    cargando,
    busqueda,
    setBusqueda,
    showModal,
    editando,
    form,
    enviando,
    errorModal,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModal,
    togglePublicada,
    eliminar,
    guardar,
    handleFormChange,
    subirImagen,
    refetch,
    pendienteConfirmacion,
    confirmarPendiente,
    cancelarPendiente,
  };
}
