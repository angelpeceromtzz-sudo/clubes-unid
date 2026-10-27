/* Hook de gestión de noticias para los paneles de admin, rectoría y el
   responsable del mural.

   PBI-17: el estado editorial (`status`) reemplazó al viejo booleano
   `publicada` como control de la UI. De aquí salen las tres vistas del flujo:
   el redactor envía a revisión, rectoría aprueba o rechaza, y el listado se
   filtra por estado. Las reglas de qué botón toca viven en
   `constants/noticias.js`; el backend las vuelve a validar. */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useConfirmacionPendiente } from './useConfirmacionPendiente';
import { filtrarPorTexto } from '../utils/filtros';
import { useNoticias } from '../contexts/NoticiasContext';
import { useAutenticacion } from '../contexts/AuthContext';
import { fechaHoyCampus } from '../utils/fechas';
import { normalizarCategoriaEvento } from '../constants/categoriasEvento';
import { esAprobadorNoticias, esRolResponsableMural } from '../constants/noticias';

const FORMULARIO_VACIO = {
  titulo: '',
  subtitulo: '',
  contenido: '',
  url_imagen: '',
  destacada: false,
  // Sólo tiene efecto para rectoría al CREAR: "publicar directamente". Para
  // admin y responsable la noticia nace siempre como borrador.
  publicada: false,
  categoria: 'informativo',
  fecha_evento: '',
  fecha_fin_evento: '',
  mostrar_en_mural: false,
  hora_evento: '',
  lugar_evento: '',
  categoria_evento: 'social',
};

const MOTIVO_MAX = 500;

export function useAdminNoticias(setFeedback, setErrorFeedback) {
  const [parametros, setParametros] = useSearchParams();
  const { refetch: refetchPublicaciones, actualizarPublicacion } = useNoticias();
  const { usuario } = useAutenticacion();
  const idRol = usuario?.id_rol;
  const esAprobador = esAprobadorNoticias(idRol);

  const [noticias, setNoticias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [cargando, setCargando] = useState(true);
  // Modal de rechazo (sólo rectoría): motivo opcional.
  const [rechazo, setRechazo] = useState(null);

  const { pendiente: pendienteConfirmacion, solicitar: solicitarConfirmacion, confirmar: confirmarPendienteBase, cancelar: cancelarPendiente } = useConfirmacionPendiente();

  useEffect(() => {
    api.getNoticiasAdmin()
      .then(setNoticias)
      .catch(() => setNoticias([]))
      .finally(() => setCargando(false));
  }, []);

  const porEstado = useCallback(
    (estado) => (estado === 'todos' ? noticias : noticias.filter((n) => n.status === estado)),
    [noticias]
  );

  const noticiasFiltradas = useMemo(
    () => filtrarPorTexto(porEstado(filtroEstado), busqueda, ['titulo', 'subtitulo', 'contenido']),
    [porEstado, filtroEstado, busqueda]
  );

  const contadores = useMemo(() => {
    const base = { todos: noticias.length, draft: 0, pending: 0, published: 0, rejected: 0 };
    noticias.forEach((n) => {
      if (base[n.status] !== undefined && n.status !== 'todos') base[n.status] += 1;
    });
    return base;
  }, [noticias]);

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
    setForm({ ...FORMULARIO_VACIO, categoria, publicada: false });
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
      // El estado de una noticia ya existente no se toca desde el formulario:
      // lo mueven los botones de revisión. Sólo sirve para reflejarlo.
      publicada: noticia.status === 'published',
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
    if (noticia) abrirModalEditar(noticia);
    setParametros((actuales) => { const nuevos = new URLSearchParams(actuales); nuevos.delete('editar_noticia'); return nuevos; }, { replace: true });
  }, [parametros, setParametros, cargando, noticias, abrirModalEditar]);

  /* ---------- Transiciones del flujo (PBI-17) ---------- */

  const ejecutarTransicion = useCallback(async (fn, noticia, mensajeExito) => {
    try {
      await fn(noticia);
      setFeedback(mensajeExito);
      await refetch();
    } catch (err) {
      setErrorFeedback(err.message);
    }
  }, [refetch, setFeedback, setErrorFeedback]);

  const enviarRevision = useCallback((noticia) =>
    ejecutarTransicion(
      (n) => api.enviarRevisionNoticia(n.id_noticia),
      noticia,
      'Noticia enviada a revisión. Rectoría la validará antes de publicarla.'
    ), [ejecutarTransicion]);

  const aprobar = useCallback((noticia) =>
    ejecutarTransicion(
      (n) => api.aprobarNoticia(n.id_noticia),
      noticia,
      'Noticia aprobada y publicada en el periódico mural.'
    ), [ejecutarTransicion]);

  const ocultar = useCallback((noticia) =>
    ejecutarTransicion(
      (n) => api.ocultarNoticia(n.id_noticia),
      noticia,
      'Noticia ocultada del periódico mural. Sigue guardada como borrador.'
    ), [ejecutarTransicion]);

  const abrirRechazo = useCallback((noticia) => {
    setRechazo({ noticia, motivo: '', error: '', enviando: false });
  }, []);

  const cerrarRechazo = useCallback(() => setRechazo(null), []);

  const setMotivoRechazo = useCallback((motivo) => {
    setRechazo((prev) => (prev ? { ...prev, motivo, error: '' } : prev));
  }, []);

  const confirmarRechazo = useCallback(async () => {
    if (!rechazo) return;
    const motivo = rechazo.motivo.trim();
    if (motivo.length > MOTIVO_MAX) {
      setRechazo((prev) => ({ ...prev, error: `El motivo no puede exceder ${MOTIVO_MAX} caracteres` }));
      return;
    }
    setRechazo((prev) => ({ ...prev, enviando: true, error: '' }));
    try {
      await api.rechazarNoticia(rechazo.noticia.id_noticia, motivo);
      setRechazo(null);
      setFeedback(motivo
        ? 'Noticia rechazada. El autor verá el motivo y podrá corregirla.'
        : 'Noticia rechazada.');
      await refetch();
    } catch (err) {
      setRechazo((prev) => (prev ? { ...prev, enviando: false, error: err.message } : prev));
    }
  }, [rechazo, refetch, setFeedback]);

  /* ---------- Alta y edición ---------- */

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
        // Sólo rectoría puede nacer publicada; para el resto el backend lo
        // ignora y guarda borrador, pero mandamos el estado explícito para que
        // el mensaje de confirmación diga la verdad.
        payload.status = esAprobador && form.publicada ? 'published' : 'draft';
        await api.createNoticia(payload);
        setFeedback(payload.status === 'published'
          ? (form.categoria === 'evento' ? 'Evento publicado correctamente' : 'Noticia publicada correctamente')
          : (form.categoria === 'evento' ? 'Evento guardado como borrador' : 'Borrador guardado. Envíalo a revisión cuando esté listo.'));
      }
      await refetch();
      setShowModal(false);
    } catch (err) {
      setErrorModal(err.message);
    } finally {
      setEnviando(false);
    }
  }, [form, editando, esAprobador, refetch, setFeedback, enviando, subiendoImagen]);

  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }, []);

  const eliminar = useCallback((noticia) => {
    solicitarConfirmacion(noticia);
  }, [solicitarConfirmacion]);

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
    contadores,
    filtroEstado,
    setFiltroEstado,
    cargando,
    busqueda,
    setBusqueda,
    showModal,
    editando,
    form,
    enviando,
    subiendoImagen,
    errorModal,
    esAprobador,
    esResponsable: esRolResponsableMural(idRol),
    idRol,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModal,
    enviarRevision,
    aprobar,
    ocultar,
    rechazo,
    abrirRechazo,
    cerrarRechazo,
    setMotivoRechazo,
    confirmarRechazo,
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
