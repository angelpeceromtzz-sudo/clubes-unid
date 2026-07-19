/* Hook para gestión de diapositivas del hero: CRUD, filtros y modal de creación/edición. */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useAdminHeroDiapositivas(setFeedback, setErrorFeedback) {
  const [diapositivas, setDiapositivas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ titulo: '', subtitulo: '', url_imagen: '', alineacion: 'izquierda', orden: '0', activa: true });
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.getDiapositivasHeroAdmin()
      .then(setDiapositivas)
      .catch(() => setDiapositivas([]))
      .finally(() => setCargando(false));
  }, []);

  const diapositivasFiltradas = (() => {
    const q = busqueda.toLowerCase().trim();
    return q
      ? diapositivas.filter(
          (d) =>
            d.titulo.toLowerCase().includes(q) ||
            (d.subtitulo && d.subtitulo.toLowerCase().includes(q))
        )
      : diapositivas;
  })();

  const refetch = useCallback(async () => {
    try {
      const actualizadas = await api.getDiapositivasHeroAdmin();
      setDiapositivas(actualizadas);
    } catch {
      // silently fail
    }
  }, []);

  const abrirModalCrear = useCallback(() => {
    setForm({ titulo: '', subtitulo: '', url_imagen: '', alineacion: 'izquierda', orden: '0', activa: true });
    setEditando(null);
    setErrorModal('');
    setShowModal(true);
  }, []);

  const abrirModalEditar = useCallback((d) => {
    setForm({
      titulo: d.titulo,
      subtitulo: d.subtitulo || '',
      url_imagen: d.url_imagen || '',
      alineacion: d.alineacion || 'izquierda',
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

  const eliminar = useCallback(async (diapositiva) => {
    if (!window.confirm(`¿Eliminar la diapositiva "${diapositiva.titulo}"?`)) return;
    try {
      await api.deleteDiapositivaHero(diapositiva.id_diapositiva);
      setFeedback('Diapositiva eliminada correctamente');
      await refetch();
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [refetch, setFeedback, setErrorFeedback]);

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
        alineacion: form.alineacion,
        orden: parseInt(form.orden, 10) || 0,
        activa: form.activa,
      };
      if (editando) {
        await api.updateDiapositivaHero(editando.id_diapositiva, payload);
        setFeedback('Diapositiva actualizada correctamente');
      } else {
        await api.createDiapositivaHero(payload);
        setFeedback('Diapositiva creada correctamente');
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
  };
}
