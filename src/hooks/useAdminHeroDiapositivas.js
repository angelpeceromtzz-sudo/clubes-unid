import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { useConfirmacionPendiente } from './useConfirmacionPendiente';
import { filtrarPorTexto } from '../utils/filtros';

const MAX_BANNERS = 6;

export function useAdminHeroDiapositivas(setFeedback, setErrorFeedback) {
  const [diapositivas, setDiapositivas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ titulo: '', subtitulo: '', url_imagen: '', orden: '1', activa: true });
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [cargando, setCargando] = useState(true);

  const { pendiente: pendienteConfirmacion, solicitar: solicitarConfirmacion, confirmar: confirmarPendienteBase, cancelar: cancelarPendiente } = useConfirmacionPendiente();

  useEffect(() => {
    api.getDiapositivasHeroAdmin()
      .then(setDiapositivas)
      .catch(() => setDiapositivas([]))
      .finally(() => setCargando(false));
  }, []);

  const diapositivasFiltradas = filtrarPorTexto(diapositivas, busqueda, ['titulo', 'subtitulo']);

  const posicionesDisponibles = useMemo(() => {
    const ocupadas = new Set(
      diapositivas
        .filter((d) => !editando || d.id_diapositiva !== editando.id_diapositiva)
        .map((d) => d.orden)
    );
    const disponibles = [];
    for (let i = 1; i <= MAX_BANNERS; i++) {
      if (!ocupadas.has(i)) disponibles.push(i);
    }
    return disponibles;
  }, [diapositivas, editando]);

  const refetch = useCallback(async () => {
    try {
      const actualizadas = await api.getDiapositivasHeroAdmin();
      setDiapositivas(actualizadas);
    } catch {
      // silently fail
    }
  }, []);

  const abrirModalCrear = useCallback(() => {
    const ocupadas = new Set(diapositivas.map((d) => d.orden));
    let siguienteOrden = 1;
    for (let i = 1; i <= MAX_BANNERS; i++) {
      if (!ocupadas.has(i)) { siguienteOrden = i; break; }
    }
    setForm({ titulo: '', subtitulo: '', url_imagen: '', orden: String(siguienteOrden), activa: true });
    setEditando(null);
    setErrorModal('');
    setShowModal(true);
  }, [diapositivas]);

  const abrirModalEditar = useCallback((d) => {
    setForm({
      titulo: d.titulo,
      subtitulo: d.subtitulo || '',
      url_imagen: d.url_imagen || '',
      orden: String(d.orden ?? 0),
      activa: d.activa,
    });
    setEditando(d);
    setErrorModal('');
    setShowModal(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const toggleActiva = useCallback(async (diapositiva) => {
    try {
      await api.updateDiapositivaHero(diapositiva.id_diapositiva, { activa: !diapositiva.activa });
      await refetch();
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [refetch, setErrorFeedback]);

  const eliminar = useCallback((diapositiva) => {
    solicitarConfirmacion(diapositiva);
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
    if (!editando && !form.url_imagen.trim()) {
      setErrorModal('La imagen es obligatoria');
      return;
    }
    setEnviando(true);
    try {
      const payload = {
        titulo: form.titulo,
        subtitulo: form.subtitulo || null,
        url_imagen: form.url_imagen || null,
        orden: parseInt(form.orden, 10) || 0,
        activa: form.activa,
      };
      if (editando) {
        await api.updateDiapositivaHero(editando.id_diapositiva, payload);
        setFeedback('Banner actualizado correctamente');
      } else {
        await api.createDiapositivaHero(payload);
        setFeedback('Banner creado correctamente');
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
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const confirmarPendiente = useCallback(async () => {
    try {
      await confirmarPendienteBase(async (d) => {
        await api.deleteDiapositivaHero(d.id_diapositiva);
        setFeedback('Banner eliminado correctamente');
        await refetch();
      });
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [confirmarPendienteBase, refetch, setFeedback, setErrorFeedback]);

  return {
    diapositivas,
    diapositivasFiltradas,
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
    toggleActiva,
    eliminar,
    guardar,
    handleFormChange,
    subirImagen,
    refetch,
    pendienteConfirmacion,
    confirmarPendiente,
    cancelarPendiente,
    posicionesDisponibles,
    maxBanners: MAX_BANNERS,
  };
}
