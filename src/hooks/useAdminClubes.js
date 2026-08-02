import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useConfirmacionPendiente } from './useConfirmacionPendiente';
import { filtrarClubes } from '../utils/filtros';
import { PARTICIPACION } from '../constants/clubes';

export function useAdminClubes(setFeedback, setErrorFeedback) {
  const [clubes, setClubes] = useState([]);
  const [busquedaClubes, setBusquedaClubes] = useState('');
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [editandoClub, setEditandoClub] = useState(null);
  const [formularioClub, setFormularioClub] = useState({ nombre_club: '', descripcion: '', categoria: '', cupo_maximo: '', imagen_portada: '', participacion: '', niveles: [] });
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [cargandoClubes, setCargandoClubes] = useState(true);

  const { pendiente: pendienteConfirmacion, solicitar: solicitarConfirmacion, confirmar: confirmarPendienteBase, cancelar: cancelarPendienteBase } = useConfirmacionPendiente();

  useEffect(() => {
    api.getClubes()
      .then(setClubes)
      .catch(() => setClubes([]))
      .finally(() => setCargandoClubes(false));
  }, []);

  const clubesActivos = clubes.filter((c) => c.id_estatus_club === 1).length;
  const clubesActivosLista = clubes.filter((c) => c.id_estatus_club === 1);
  const clubesFiltrados = filtrarClubes(clubes, busquedaClubes);

  const refetchClubes = useCallback(async () => {
    try {
      const actualizados = await api.getClubes();
      setClubes(actualizados);
    } catch {
      // silently fail on background refresh
    }
  }, []);

  const manejarCambioEstatus = useCallback(async (clubId, nuevoEstatusId) => {
    if (nuevoEstatusId === 3) {
      solicitarConfirmacion({ tipo: 'baja', clubId, nuevoEstatusId });
      return;
    }
    try {
      await api.updateClubEstatus(clubId, nuevoEstatusId);
      const actualizados = await api.getClubes();
      setClubes(actualizados);
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [solicitarConfirmacion, setErrorFeedback]);

  const abrirModalCrear = useCallback(() => {
    setFormularioClub({ nombre_club: '', descripcion: '', categoria: '', cupo_maximo: '', imagen_portada: '', participacion: '', niveles: [] });
    setEditandoClub(null);
    setErrorModal('');
    setMostrarModalCrear(true);
  }, []);

  const abrirModalEditar = useCallback((club) => {
    setFormularioClub({
      nombre_club: club.nombre_club,
      descripcion: club.descripcion || '',
      categoria: club.categoria,
      cupo_maximo: String(club.cupo_maximo),
      imagen_portada: club.imagen_portada || '',
      participacion: club.participacion || '',
      niveles: (club.niveles || []).map((n) => n.id_nivel),
    });
    setEditandoClub(club);
    setErrorModal('');
    setMostrarModalCrear(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setMostrarModalCrear(false);
  }, []);

  const guardarClub = useCallback(async (e) => {
    e.preventDefault();
    setErrorModal('');
    if (!formularioClub.nombre_club.trim() || !formularioClub.descripcion.trim() || !formularioClub.categoria.trim() || !formularioClub.cupo_maximo) {
      setErrorModal('Todos los campos son obligatorios');
      return;
    }
    if (!PARTICIPACION.some((p) => p.valor === formularioClub.participacion)) {
      setErrorModal('La participación es obligatoria');
      return;
    }
    if (formularioClub.niveles.length === 0) {
      setErrorModal('Selecciona al menos un nivel');
      return;
    }
    if (!editandoClub && !formularioClub.imagen_portada.trim()) {
      setErrorModal('La imagen del club es obligatoria');
      return;
    }
    if (editandoClub) {
      setMostrarModalCrear(false);
      solicitarConfirmacion({ tipo: 'editar', club: editandoClub });
      return;
    }
    setEnviando(true);
    try {
      await api.createClub({
        nombre_club: formularioClub.nombre_club,
        descripcion: formularioClub.descripcion,
        categoria: formularioClub.categoria,
        cupo_maximo: Number(formularioClub.cupo_maximo),
        imagen_portada: formularioClub.imagen_portada || null,
        participacion: formularioClub.participacion,
        niveles: formularioClub.niveles,
      });
      setFeedback('Club creado correctamente');
      const actualizados = await api.getClubes();
      setClubes(actualizados);
      setMostrarModalCrear(false);
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setEnviando(false);
    }
  }, [formularioClub, editandoClub, solicitarConfirmacion, setFeedback]);

  const manejarCambioFormularioClub = useCallback((e) => {
    const { name, value } = e.target;
    setFormularioClub((prev) => ({ ...prev, [name]: value }));
  }, []);

  const toggleNivel = useCallback((idNivel) => {
    setFormularioClub((prev) => {
      const activo = prev.niveles.includes(idNivel);
      return {
        ...prev,
        niveles: activo ? prev.niveles.filter((n) => n !== idNivel) : [...prev.niveles, idNivel],
      };
    });
  }, []);

  const subirImagen = useCallback(async (file) => {
    try {
      const result = await api.uploadImagen(file);
      setFormularioClub((prev) => ({ ...prev, imagen_portada: result.url }));
    } catch (err) {
      setErrorModal(err.message);
    }
  }, []);

  const confirmarPendiente = useCallback(async () => {
    try {
      await confirmarPendienteBase(async (p) => {
        if (p.tipo === 'baja') {
          await api.updateClubEstatus(p.clubId, p.nuevoEstatusId);
        } else if (p.tipo === 'editar') {
          setEnviando(true);
          try {
            await api.updateClub(p.club.id_club, {
              nombre_club: formularioClub.nombre_club,
              descripcion: formularioClub.descripcion,
              categoria: formularioClub.categoria,
              cupo_maximo: Number(formularioClub.cupo_maximo),
              imagen_portada: formularioClub.imagen_portada || null,
              participacion: formularioClub.participacion,
              niveles: formularioClub.niveles,
            });
            setFeedback('Club actualizado correctamente');
            setMostrarModalCrear(false);
          } finally {
            setEnviando(false);
          }
        }
        const actualizados = await api.getClubes();
        setClubes(actualizados);
      });
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [confirmarPendienteBase, formularioClub, setFeedback, setErrorFeedback]);

  const cancelarPendiente = useCallback(() => {
    if (pendienteConfirmacion?.tipo === 'editar') {
      setMostrarModalCrear(true);
    }
    cancelarPendienteBase();
  }, [pendienteConfirmacion, cancelarPendienteBase]);

  return {
    clubes,
    cargandoClubes,
    busquedaClubes,
    setBusquedaClubes,
    clubesFiltrados,
    clubesActivos,
    clubesActivosList: clubesActivosLista,
    showModalCrear: mostrarModalCrear,
    editandoClub,
    formClub: formularioClub,
    enviando,
    modalError: errorModal,
    handleStatusChange: manejarCambioEstatus,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModal,
    guardarClub,
    handleClubFormChange: manejarCambioFormularioClub,
    toggleNivel,
    subirImagen,
    refetchClubes,
    pendienteConfirmacion,
    confirmarPendiente,
    cancelarPendiente,
  };
}
