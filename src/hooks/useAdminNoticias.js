/* Hook de gestión de noticias para los paneles de admin y rectoría. */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useConfirmacionPendiente } from './useConfirmacionPendiente';
import { filtrarPorTexto } from '../utils/filtros';
import { useNoticias } from '../contexts/NoticiasContext';
import { fechaHoyCampus } from '../utils/fechas';
import { normalizarCategoriaEvento } from '../constants/categoriasEvento';

const FORMULARIO_VACIO = {
  titulo: '',
  subtitulo: '',
  contenido: '',
  url_imagen: '',
  destacada: false,
  publicada: true,
  categoria: 'informativo',
  fecha_evento: '',
  fecha_fin_evento: '',
  mostrar_en_mural: false,
  hora_evento: '',
  lugar_evento: '',
  categoria_evento: 'social',
};

export function useAdminNoticias(setFeedback, setErrorFeedback) {
  const [parametros, setParametros] = useSearchParams();
  const { refetch: refetchPublicaciones, actualizarPublicacion } = useNoticias();
  const [noticias, setNoticias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [cargando, setCargando] = useState(true);

  const { pendiente: pendienteConfirmacion, solicitar: solicitarConfirmacion, confirmar: confirmarPendienteBase, cancelar: cancelarPendiente } = useConfirmacionPendiente();

  useEffect(() => {
    api.getNoticiasAdmin()
      .then(setNoticias)
      .catch(() => setNoticias([]))
      .finally(() => setCargando(false));
  }, []);

  const noticiasFiltradas = filtrarPorTexto(noticias, busqueda, ['titulo', 'subtitulo', 'contenido']);

  const incorporarPublicacion = useCallback((publicacion) => {
    setNoticias((lista) => [publicacion, ...lista.filter((item) => item.id_noticia !== publicacion.id_noticia)]);
    actualizarPublicacion(publicacion);
  }, [actualizarPublicacion]);

  const refetch = useCallback(async () => {
    try {
      const actualizadas = await api.getNoticiasAdmin();
      setNoticias(actualizadas);
      await refetchPublicaciones();
    } catch {
      // silently fail
    }
  }, [refetchPublicaciones]);

  const abrirModalCrear = useCallback((categoria = 'informativo') => {
    setForm({ ...FORMULARIO_VACIO, categoria });
    setEditando(null);
    setErrorModal('');
    setShowModal(true);
  }, []);

  const abrirModalEditar = useCallback((noticia) => {
    setForm({
      titulo: noticia.titulo || '',
      subtitulo: noticia.subtitulo || '',
      contenido: noticia.contenido || '',
      url_imagen: noticia.url_imagen || '',
      destacada: noticia.destacada === true,
      publicada: noticia.publicada === true,
      categoria: noticia.categoria || 'informativo',
      fecha_evento: noticia.fecha_evento ? String(noticia.fecha_evento).slice(0, 10) : '',
      fecha_fin_evento: noticia.fecha_fin_evento ? String(noticia.fecha_fin_evento).slice(0, 10) : '',
      mostrar_en_mural: noticia.mostrar_en_mural === true,
      hora_evento: noticia.hora_evento ? String(noticia.hora_evento).slice(0, 5) : '',
      lugar_evento: noticia.lugar_evento || '',
      categoria_evento: normalizarCategoriaEvento(noticia.categoria_evento),
    });
    setEditando(noticia);
    setErrorModal('');
    setShowModal(true);
  }, []);

  const cerrarModal = useCallback(() => setShowModal(false), []);

  useEffect(() => {
    const id = parametros.get('editar_noticia');
    if (!id || cargando) return;
    const noticia = noticias.find((item) => String(item.id_noticia) === id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (noticia) abrirModalEditar(noticia);
    setParametros((actuales) => { const nuevos = new URLSearchParams(actuales); nuevos.delete('editar_noticia'); return nuevos; }, { replace: true });
  }, [parametros, setParametros, cargando, noticias, abrirModalEditar]);

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
    setSubiendoImagen(true);
    try {
      const result = await api.uploadImagen(file);
      setForm((prev) => ({ ...prev, url_imagen: result.url }));
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setSubiendoImagen(false);
    }
  }, []);

  const guardar = useCallback(async (e) => {
    e.preventDefault();
    if (enviando || subiendoImagen) return;
    setErrorModal('');
    if (!form.titulo.trim()) {
      setErrorModal('El título es obligatorio');
      return;
    }
    if (!form.contenido.trim()) {
      setErrorModal('El contenido es obligatorio');
      return;
    }
    if (form.categoria === 'evento' && !form.fecha_evento) {
      setErrorModal('La fecha del evento es obligatoria');
      return;
    }
    if (form.categoria === 'evento' && form.fecha_evento < fechaHoyCampus() &&
        (!editando || form.fecha_evento !== String(editando.fecha_evento || '').slice(0, 10))) {
      setErrorModal('La fecha del evento no puede ser pasada');
      return;
    }
    if (form.categoria === 'evento' && form.fecha_fin_evento && form.fecha_fin_evento < form.fecha_evento) {
      setErrorModal('La fecha de fin no puede ser anterior al inicio');
      return;
    }
    setEnviando(true);
    try {
      const payload = {
        titulo: form.titulo,
        subtitulo: form.subtitulo?.trim() || null,
        contenido: form.contenido,
        url_imagen: form.url_imagen || null,
        destacada: form.destacada,
        publicada: form.publicada,
        categoria: form.categoria,
        fecha_evento: form.categoria === 'evento' ? form.fecha_evento : null,
        fecha_fin_evento: form.categoria === 'evento' ? form.fecha_fin_evento || null : null,
        mostrar_en_mural: form.mostrar_en_mural,
        hora_evento: form.categoria === 'evento' ? form.hora_evento || null : null,
        lugar_evento: form.categoria === 'evento' ? form.lugar_evento : null,
        categoria_evento: form.categoria === 'evento' ? form.categoria_evento : 'social',
      };
      if (editando) {
        await api.updateNoticia(editando.id_noticia, payload);
        setFeedback(form.categoria === 'evento' ? 'Evento actualizado correctamente' : 'Noticia actualizada correctamente');
      } else {
        await api.createNoticia(payload);
        setFeedback(form.categoria === 'evento' ? 'Evento guardado correctamente' : 'Noticia publicada correctamente');
      }
      await refetch();
      setShowModal(false);
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setEnviando(false);
    }
  }, [form, editando, refetch, setFeedback, enviando, subiendoImagen]);

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
    subiendoImagen,
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
    incorporarPublicacion,
    pendienteConfirmacion,
    confirmarPendiente,
    cancelarPendiente,
  };
}
