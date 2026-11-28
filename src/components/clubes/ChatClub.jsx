import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import { useAutenticacion } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { crearCoordinadorPresencia, crearEjecutorConCadenciaCompartida } from '../../utils/chatClubCadencia';
import { STICKERS_URIEL, leerStickerUriel } from '../../../shared/stickersUriel.js';
import { UrielSticker } from './UrielSticker';
import './ChatClub.css';

const MAX_CARACTERES = 400;
const EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '😮', '😢', '🔥', '🐺', '✨', '💙', '🙌'];
const INTERVALO_SINCRONIZACION = 3500;
const INTERVALO_PRESENCIA = 15000;
// Un único tick de presencia activa cada 3 s por usuario/club entre pestañas.
// El heartbeat de 15 s usa el estado omitido para no borrar el typing ajeno.
const INTERVALO_PING_ESCRITURA = 3000;

function fusionarMensajes(actuales = [], entrantes = []) {
  const porId = new Map();
  for (const mensaje of [...actuales, ...entrantes]) {
    if (mensaje?.id_mensaje != null) porId.set(Number(mensaje.id_mensaje), mensaje);
  }
  return [...porId.values()].sort((a, b) => Number(a.id_mensaje) - Number(b.id_mensaje));
}

function ultimoIdMensaje(mensajes = []) {
  return Number(mensajes.at(-1)?.id_mensaje || 0);
}

function nombreClase(persona, club) {
  const idPersona = Number(persona.id_usuario ?? persona.id_autor);
  if (persona.es_responsable || idPersona === Number(club.id_responsable_club)) return 'chat-club__nombre chat-club__nombre--responsable';
  if (persona.es_vicepresidente || idPersona === Number(club.id_vicepresidente)) return 'chat-club__nombre chat-club__nombre--vicepresidente';
  return 'chat-club__nombre';
}

function renderContenido(contenido, menciones = []) {
  const referencias = (menciones || []).map((m) => `@${m.nombre || ''}`).filter((t) => t.length > 1);
  if (!referencias.length) return contenido;
  const partes = [];
  let cursor = 0;
  while (cursor < contenido.length) {
    let encontrada = null;
    for (const texto of referencias) {
      const indice = contenido.indexOf(texto, cursor);
      if (indice !== -1 && (!encontrada || indice < encontrada.indice)) encontrada = { indice, texto };
    }
    if (!encontrada) { partes.push(contenido.slice(cursor)); break; }
    if (encontrada.indice > cursor) partes.push(contenido.slice(cursor, encontrada.indice));
    partes.push(<span className="chat-club__mencion" key={`${encontrada.indice}-${encontrada.texto}`}>{encontrada.texto}</span>);
    cursor = encontrada.indice + encontrada.texto.length;
  }
  return partes;
}

export function ChatClub({ club, ocuparPantalla = false }) {
  const { usuario } = useAutenticacion();
  const { modoOscuro } = useTheme();
  const [chat, setChat] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [texto, setTexto] = useState('');
  const [menciones, setMenciones] = useState([]);
  const [seleccionMencion, setSeleccionMencion] = useState(null);
  const [editarId, setEditarId] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const [miembrosAbiertos, setMiembrosAbiertos] = useState(false);
  const [fijadosAbiertos, setFijadosAbiertos] = useState(true);
  const [menuMensaje, setMenuMensaje] = useState(null);
  const [selectorEmoji, setSelectorEmoji] = useState(false);
  const [selectorSticker, setSelectorSticker] = useState(false);
  const [selectorReaccion, setSelectorReaccion] = useState(null);
  const [reaccionPendiente, setReaccionPendiente] = useState(null);
  const [menuSilencioId, setMenuSilencioId] = useState(null);
  const [mensajesNuevos, setMensajesNuevos] = useState(0);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);
  const chatDatosRef = useRef(null);
  const contextoChatRef = useRef(null);
  const canalChatRef = useRef(null);
  const chatRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const pegadoAlFinal = useRef(true);
  const escribiendoRef = useRef(false);
  const timerEscritura = useRef(null);
  const timerMantenerMensaje = useRef(null);
  const pulsacionLarga = useRef(false);
  const inicioRef = useRef(true);
  const miId = Number(usuario?.id_usuario || usuario?.id);
  const esResponsable = Number(club.id_responsable_club) === miId;
  const temaClaro = !modoOscuro;
  const puedeCompartirSnapshots = typeof globalThis.BroadcastChannel === 'function';
  const ejecutarPollingCompartido = useMemo(() => crearEjecutorConCadenciaCompartida({
    clave: `poll:${miId}:${club.id_club}`,
    intervaloMs: INTERVALO_SINCRONIZACION,
  }), [miId, club.id_club]);
  const ejecutarPresenciaCompartida = useMemo(() => crearEjecutorConCadenciaCompartida({
    clave: `presencia:${miId}:${club.id_club}`,
    intervaloMs: INTERVALO_PING_ESCRITURA,
  }), [miId, club.id_club]);
  const controlPresencia = useMemo(() => crearCoordinadorPresencia({
    intervaloMs: INTERVALO_PING_ESCRITURA,
    enviar: (escribiendo, activo) => {
      if (!activo) return api.actualizarPresenciaChat(club.id_club, false, false);
      if (escribiendo == null) {
        return ejecutarPresenciaCompartida(() => api.actualizarPresenciaChat(club.id_club));
      }
      return ejecutarPresenciaCompartida(() => api.actualizarPresenciaChat(club.id_club, escribiendo));
    },
  }), [club.id_club, ejecutarPresenciaCompartida]);

  const actualizarChat = useCallback((siguiente) => {
    chatDatosRef.current = siguiente;
    setChat(siguiente);
  }, []);

  const marcarChatLeido = useCallback(async () => {
    const contexto = contextoChatRef.current;
    if (!contexto || contexto.idClub !== club.id_club || !contexto.montado) return;
    const ultimo = ultimoIdMensaje(chatDatosRef.current?.mensajes);
    if (ultimo <= contexto.ultimoIdMarcado) return;
    if (contexto.marcandoLectura !== null) {
      contexto.marcaPendiente = Math.max(contexto.marcaPendiente || 0, ultimo);
      return;
    }

    async function ejecutarMarcado(objetivo) {
      if (contextoChatRef.current !== contexto || !contexto.montado) return;
      contexto.marcandoLectura = objetivo;
      try {
        await api.marcarChatClubLeido(club.id_club);
        if (contextoChatRef.current === contexto && contexto.montado) {
          contexto.ultimoIdMarcado = Math.max(contexto.ultimoIdMarcado, objetivo);
          window.dispatchEvent(new CustomEvent('clubsunid:notificaciones-refresh'));
          if (objetivo >= ultimoIdMensaje(chatDatosRef.current?.mensajes)) setMensajesNuevos(0);
        }
      } catch {
        // La siguiente sincronización aplicable podrá reintentar la lectura.
      } finally {
        if (contextoChatRef.current === contexto && contexto.montado) {
          contexto.marcandoLectura = null;
          const pendiente = contexto.marcaPendiente;
          contexto.marcaPendiente = null;
          if (pendiente > contexto.ultimoIdMarcado) void ejecutarMarcado(pendiente);
        }
      }
    }

    await ejecutarMarcado(ultimo);
  }, [club.id_club]);

  const sincronizar = useCallback(async ({ marcarLeido = false } = {}) => {
    const contexto = contextoChatRef.current;
    if (!contexto || contexto.idClub !== club.id_club || !contexto.montado) return;
    if (contexto.leyendo) {
      contexto.sincronizacionPendiente = true;
      contexto.forzarLecturaPendiente ||= marcarLeido;
      return;
    }

    contexto.leyendo = true;
    const forzarPendiente = contexto.forzarLecturaPendiente;
    contexto.sincronizacionPendiente = false;
    contexto.forzarLecturaPendiente = false;
    const forzarLectura = marcarLeido || forzarPendiente;
    try {
      // Un tick compartido realiza como máximo un GET normal. Las páginas para
      // completar huecos son excepciones bajo demanda del propio tick.
      if (contextoChatRef.current === contexto && contexto.montado) {
        const token = ++contexto.secuencia;
        const datosActuales = chatDatosRef.current;
        const anterior = datosActuales?.club?.id_club === club.id_club ? datosActuales : null;
        const siguiente = await api.obtenerChatClub(club.id_club);
        if (contextoChatRef.current !== contexto || !contexto.montado || token !== contexto.secuencia) return;

        const ultimoAnterior = ultimoIdMensaje(anterior?.mensajes);
        let mensajes = fusionarMensajes(anterior?.mensajes, siguiente.mensajes || []);
        let masAnteriores = anterior ? Boolean(anterior.mas_anteriores) : Boolean(siguiente.mas_anteriores);
        const primeroNuevo = (siguiente.mensajes || [])
          .map((mensaje) => Number(mensaje.id_mensaje))
          .find((id) => id > ultimoAnterior);

        if (anterior && primeroNuevo > ultimoAnterior + 1) {
          setCargandoAnteriores(true);
          try {
            let cursor = primeroNuevo;
            while (true) {
              const pagina = await api.obtenerChatClub(club.id_club, cursor);
              if (contextoChatRef.current !== contexto || !contexto.montado || token !== contexto.secuencia) return;
              const paginaMensajes = pagina.mensajes || [];
              if (!paginaMensajes.length) break;
              const primeroPagina = Number(paginaMensajes[0].id_mensaje);
              // Las páginas antiguas completan huecos, pero no sustituyen mensajes ya conocidos.
              mensajes = fusionarMensajes(paginaMensajes, mensajes);
              masAnteriores = Boolean(masAnteriores && pagina.mas_anteriores);
              if (primeroPagina <= ultimoAnterior + 1 || !pagina.mas_anteriores) break;
              if (primeroPagina >= cursor) throw new Error('No se pudo completar el historial intermedio.');
              cursor = primeroPagina;
            }
          } finally {
            if (contextoChatRef.current === contexto && contexto.montado) setCargandoAnteriores(false);
          }
        }

        if (contextoChatRef.current !== contexto || !contexto.montado || token !== contexto.secuencia) return;
        const ultimoNuevo = ultimoIdMensaje(mensajes);
        const nuevosIds = new Set(mensajes
          .filter((mensaje) => Number(mensaje.id_mensaje) > ultimoAnterior)
          .map((mensaje) => Number(mensaje.id_mensaje)));
        const snapshot = { ...siguiente, mensajes, mas_anteriores: masAnteriores };
        actualizarChat(snapshot);
        try {
          canalChatRef.current?.postMessage({
            tipo: 'snapshot',
            idClub: club.id_club,
            idUsuario: miId,
            datos: snapshot,
          });
        } catch {
          // BroadcastChannel es una optimización; el polling local sigue viable.
        }

        if (!inicioRef.current && !pegadoAlFinal.current && nuevosIds.size) {
          setMensajesNuevos((cantidad) => cantidad + nuevosIds.size);
        }
        if (forzarLectura || (pegadoAlFinal.current && !inicioRef.current && ultimoNuevo > contexto.ultimoIdMarcado)) {
          await marcarChatLeido();
        }
        if (contextoChatRef.current !== contexto || !contexto.montado || token !== contexto.secuencia) return;
        inicioRef.current = false;
        // Si hubo otra solicitud durante el GET, su bandera queda pendiente y
        // el siguiente tick compartido la procesa; no se encadena otro GET.
      }
    } finally {
      if (contextoChatRef.current === contexto && contexto.montado) {
        contexto.leyendo = false;
        setCargandoAnteriores(false);
      }
    }
  }, [club.id_club, miId, actualizarChat, marcarChatLeido]);

  useEffect(() => {
    const contexto = {
      idClub: club.id_club,
      montado: true,
      leyendo: false,
      secuencia: 0,
      sincronizacionPendiente: false,
      forzarLecturaPendiente: false,
      marcandoLectura: null,
      marcaPendiente: null,
      ultimoIdMarcado: 0,
    };
    contextoChatRef.current = contexto;
    chatDatosRef.current = null;
    inicioRef.current = true;
    pegadoAlFinal.current = true;

    let canal = null;
    if (puedeCompartirSnapshots) {
      canal = new BroadcastChannel(`clubsunid:chat:${miId}:${club.id_club}`);
      canal.onmessage = (evento) => {
        const datos = evento.data;
        if (
          !contexto.montado
          || datos?.tipo !== 'snapshot'
          || Number(datos.idClub) !== Number(club.id_club)
          || Number(datos.idUsuario) !== miId
          || !datos.datos
        ) return;
        // Un snapshot de otra pestaña invalida un GET local más antiguo y se
        // fusiona para no perder mensajes que ya conocía esta pestaña.
        contexto.secuencia += 1;
        const actuales = chatDatosRef.current;
        actualizarChat({
          ...datos.datos,
          mensajes: fusionarMensajes(actuales?.mensajes, datos.datos.mensajes),
        });
      };
      canalChatRef.current = canal;
    }

    const iniciar = async () => {
      setChat(null);
      setCargando(true);
      setCargandoAnteriores(false);
      setMensajesNuevos(0);
      setError('');
      try {
        // La presencia es opcional: un 429 no debe impedir abrir el chat.
        controlPresencia.publicarLatido();
        await sincronizar({ marcarLeido: true });
        if (contextoChatRef.current === contexto && contexto.montado) setError('');
      } catch (err) {
        if (contextoChatRef.current === contexto && contexto.montado) setError(err.message || 'No se pudo abrir el chat del club.');
      } finally {
        if (contextoChatRef.current === contexto && contexto.montado) setCargando(false);
      }
    };
    iniciar();

    const sincronizarVisible = (marcarLeido = false) => {
      const accion = () => sincronizar({ marcarLeido });
      // Sin BroadcastChannel no podemos distribuir el snapshot ganador a las
      // demás pestañas; en ese caso se degrada a polling local por visibilidad.
      const resultado = puedeCompartirSnapshots ? ejecutarPollingCompartido(accion) : accion();
      resultado.catch(() => {});
    };
    const polling = window.setInterval(() => {
      if (document.visibilityState === 'visible') sincronizarVisible();
    }, INTERVALO_SINCRONIZACION);
    const presencia = window.setInterval(() => {
      if (document.visibilityState === 'visible') controlPresencia.publicarLatido();
    }, INTERVALO_PRESENCIA);
    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        sincronizarVisible(true);
        controlPresencia.publicarLatido();
      }
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      contexto.montado = false;
      contexto.secuencia += 1;
      if (contextoChatRef.current === contexto) contextoChatRef.current = null;
      window.clearInterval(polling);
      window.clearInterval(presencia);
      window.clearTimeout(timerEscritura.current);
      window.clearTimeout(timerMantenerMensaje.current);
      controlPresencia.publicar(false, false);
      controlPresencia.cancelarPendientes();
      canal?.close();
      if (canalChatRef.current === canal) canalChatRef.current = null;
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [club.id_club, miId, sincronizar, actualizarChat, controlPresencia, ejecutarPollingCompartido, puedeCompartirSnapshots]);

  const ultimoMensajeId = chat?.mensajes?.at(-1)?.id_mensaje;
  useEffect(() => {
    if (pegadoAlFinal.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [ultimoMensajeId]);

  useEffect(() => {
    if (!espera) return undefined;
    const timer = window.setTimeout(() => setEspera((actual) => Math.max(0, actual - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [espera]);

  useEffect(() => {
    if (menuMensaje == null) return undefined;
    const cerrarFuera = (evento) => {
      const destino = evento.target;
      if (!(destino instanceof Element) || !destino.closest('[data-chat-mensaje], [data-chat-acciones]')) setMenuMensaje(null);
    };
    const cerrarEscape = (evento) => { if (evento.key === 'Escape') setMenuMensaje(null); };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    document.addEventListener('scroll', cerrarFuera, true);
    window.addEventListener('resize', cerrarEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
      document.removeEventListener('scroll', cerrarFuera, true);
      window.removeEventListener('resize', cerrarEscape);
    };
  }, [menuMensaje]);

  useEffect(() => {
    const campo = inputRef.current;
    if (!campo) return;
    campo.style.height = 'auto';
    const altura = Math.min(campo.scrollHeight, 128);
    campo.style.height = `${altura}px`;
    campo.style.overflowY = campo.scrollHeight > 128 ? 'auto' : 'hidden';
  }, [texto]);

  const miembros = useMemo(() => chat?.miembros || [], [chat?.miembros]);
  const fijados = chat?.fijados || [];
  const silenciado = Boolean(miembros.find((miembro) => Number(miembro.id_usuario) === miId)?.silenciado);
  const conectados = useMemo(() => miembros.filter((m) => m.conectado), [miembros]);
  const escribiendo = useMemo(() => miembros.filter((m) => m.escribiendo && Number(m.id_usuario) !== miId), [miembros, miId]);
  const candidatosMencion = useMemo(() => {
    if (seleccionMencion == null) return [];
    return miembros.filter((m) => Number(m.id_usuario) !== miId && m.nombre_completo.toLowerCase().includes(seleccionMencion.toLowerCase())).slice(0, 5);
  }, [miembros, seleccionMencion, miId]);

  function avisarEscritura() {
    escribiendoRef.current = true;
    controlPresencia.publicar(true);
    window.clearTimeout(timerEscritura.current);
    timerEscritura.current = window.setTimeout(() => {
      escribiendoRef.current = false;
      controlPresencia.publicar(false);
    }, 5000);
  }

  function manejarTexto(valor) {
    const limitado = Array.from(valor).slice(0, MAX_CARACTERES).join('');
    setTexto(limitado);
    const cursor = inputRef.current?.selectionStart ?? limitado.length;
    const antesCursor = limitado.slice(0, cursor);
    const indiceArroba = antesCursor.lastIndexOf('@');
    const fragmento = indiceArroba >= 0 ? antesCursor.slice(indiceArroba + 1) : '';
    setSeleccionMencion(indiceArroba >= 0 && !/\s/.test(fragmento) ? fragmento : null);
    setMenciones((anteriores) => anteriores.filter((m) => limitado.includes(m.token)));
    if (limitado.trim()) avisarEscritura();
    else {
      escribiendoRef.current = false;
      window.clearTimeout(timerEscritura.current);
      controlPresencia.publicar(false);
    }
  }

  function insertarMencion(miembro) {
    const cursor = inputRef.current?.selectionStart ?? texto.length;
    const antesCursor = texto.slice(0, cursor);
    const indiceArroba = antesCursor.lastIndexOf('@');
    if (indiceArroba < 0) return;
    const token = `@${miembro.nombre_completo}`;
    const nuevoTexto = `${texto.slice(0, indiceArroba)}${token} ${texto.slice(cursor)}`;
    setTexto(nuevoTexto);
    setMenciones((prev) => [...prev.filter((m) => m.id !== miembro.id_usuario), { id: miembro.id_usuario, token }]);
    setSeleccionMencion(null);
    window.setTimeout(() => {
      inputRef.current?.focus();
      const nuevaPosicion = indiceArroba + token.length + 1;
      inputRef.current?.setSelectionRange(nuevaPosicion, nuevaPosicion);
    }, 0);
  }

  function insertarEmoji(emoji) {
    const campoTexto = inputRef.current;
    const inicio = campoTexto?.selectionStart ?? texto.length;
    const fin = campoTexto?.selectionEnd ?? inicio;
    const nuevo = `${texto.slice(0, inicio)}${emoji}${texto.slice(fin)}`;
    if (Array.from(nuevo).length > MAX_CARACTERES) return;
    manejarTexto(nuevo);
    setSelectorEmoji(false);
    window.requestAnimationFrame(() => {
      campoTexto?.focus();
      campoTexto?.setSelectionRange(inicio + emoji.length, inicio + emoji.length);
    });
  }

  async function alternarReaccion(idMensaje, emoji) {
    if (reaccionPendiente) return;
    setReaccionPendiente(`${idMensaje}:${emoji}`);
    setSelectorReaccion(null);
    try {
      await api.alternarReaccionChat(club.id_club, idMensaje, emoji);
      const pagina = await api.obtenerChatClub(club.id_club, Number(idMensaje) + 1);
      const vigente = chatDatosRef.current;
      if (vigente?.club?.id_club === club.id_club) actualizarChat({ ...vigente, mensajes: fusionarMensajes(vigente.mensajes, pagina.mensajes || []) });
      await sincronizar();
    } catch (err) { setError(err.message || 'No se pudo guardar la reacción.'); }
    finally { setReaccionPendiente(null); }
  }

  async function enviar(evento) {
    evento?.preventDefault();
    if (!texto.trim() || enviando || espera > 0) return;
    setEnviando(true);
    setError('');
    try {
      if (editarId) await api.editarMensajeChat(club.id_club, editarId, texto.trim(), menciones.map((m) => m.id));
      else await api.enviarMensajeChat(club.id_club, texto.trim(), menciones.map((m) => m.id));
      const contexto = contextoChatRef.current;
      if (!contexto || contexto.idClub !== club.id_club || !contexto.montado) return;
      setTexto(''); setMenciones([]); setEditarId(null); setSeleccionMencion(null); setEspera(editarId ? 0 : 4);
      window.clearTimeout(timerEscritura.current);
      escribiendoRef.current = false;
      controlPresencia.publicar(false);
      pegadoAlFinal.current = true;
      await sincronizar({ marcarLeido: true });
    } catch (err) {
      setError(err.message || 'No se pudo enviar el mensaje.');
      if (err.status === 429) setEspera(err.reintentarEnSegundos || 4);
    } finally { setEnviando(false); }
  }

  async function enviarSticker(id) {
    if (enviando || espera > 0 || silenciado || editarId) return;
    setEnviando(true);
    setError('');
    try {
      await api.enviarStickerChat(club.id_club, id);
      const contexto = contextoChatRef.current;
      if (!contexto || contexto.idClub !== club.id_club || !contexto.montado) return;
      setSelectorSticker(false);
      setEspera(4);
      pegadoAlFinal.current = true;
      await sincronizar({ marcarLeido: true });
    } catch (err) {
      setError(err.message || 'No se pudo enviar el sticker.');
      if (err.status === 429) setEspera(err.reintentarEnSegundos || 4);
    } finally { setEnviando(false); }
  }

  async function cargarAnteriores() {
    const contexto = contextoChatRef.current;
    const actual = chatDatosRef.current;
    const primero = Number(actual?.mensajes?.[0]?.id_mensaje || 0);
    if (!contexto || contexto.idClub !== club.id_club || !contexto.montado
      || contexto.leyendo || !actual?.mas_anteriores || !primero) return;

    const panel = scrollRef.current;
    const alturaAnterior = panel?.scrollHeight || 0;
    contexto.leyendo = true;
    const token = ++contexto.secuencia;
    setCargandoAnteriores(true);
    try {
      const anterior = await api.obtenerChatClub(club.id_club, primero);
      if (contextoChatRef.current !== contexto || !contexto.montado || token !== contexto.secuencia) return;
      const vigente = chatDatosRef.current;
      if (!vigente || Number(vigente.mensajes?.[0]?.id_mensaje) !== primero) return;
      actualizarChat({
        ...vigente,
        mensajes: fusionarMensajes(anterior.mensajes || [], vigente.mensajes || []),
        mas_anteriores: Boolean(vigente.mas_anteriores && anterior.mas_anteriores),
      });
      window.requestAnimationFrame(() => {
        if (contextoChatRef.current === contexto && contexto.montado && panel) {
          panel.scrollTop = panel.scrollHeight - alturaAnterior;
        }
      });
    } catch (err) {
      if (contextoChatRef.current === contexto && contexto.montado) setError(err.message || 'No se pudo cargar el historial.');
    } finally {
      if (contextoChatRef.current === contexto && contexto.montado) {
        contexto.leyendo = false;
        setCargandoAnteriores(false);
        if (contexto.sincronizacionPendiente) {
          const forzarLectura = contexto.forzarLecturaPendiente;
          contexto.sincronizacionPendiente = false;
          contexto.forzarLecturaPendiente = false;
          void sincronizar({ marcarLeido: forzarLectura });
        }
      }
    }
  }

  async function borrarMensaje(id) {
    if (!window.confirm('¿Quieres borrar este mensaje?')) return;
    try { await api.eliminarMensajeChat(club.id_club, id); await sincronizar(); setMenuMensaje(null); }
    catch (err) { setError(err.message || 'No se pudo borrar el mensaje.'); }
  }

  function abrirMenuMensaje(elemento, idMensaje, alinearDerecha) {
    const rect = elemento.getBoundingClientRect();
    const cuadro = chatRef.current?.getBoundingClientRect() || { top: 0, right: window.innerWidth, bottom: window.innerHeight, left: 0, height: window.innerHeight };
    const margen = 8;
    const ancho = Math.max(1, Math.min(224, cuadro.width - margen * 2));
    const espacioArriba = Math.max(0, rect.top - cuadro.top - margen);
    const espacioAbajo = Math.max(0, cuadro.bottom - rect.bottom - margen);
    const cantidadAcciones = Number(alinearDerecha) + Number(alinearDerecha || esResponsable) + Number(esResponsable);
    const altoEstimado = cantidadAcciones * 40 + 16;
    const ubicacion = espacioAbajo >= altoEstimado || espacioAbajo >= espacioArriba ? 'abajo' : 'arriba';
    const espacioElegido = ubicacion === 'arriba' ? espacioArriba : espacioAbajo;
    const alturaMaxima = Math.max(0, Math.min(espacioElegido, cuadro.height - margen * 2));
    const izquierdaDeseada = alinearDerecha ? rect.right - ancho : rect.left;
    const izquierda = Math.max(cuadro.left + margen, Math.min(izquierdaDeseada, cuadro.right - ancho - margen));
    setMenuMensaje({ id: idMensaje, izquierda, vertical: ubicacion === 'arriba' ? rect.top - margen : rect.bottom + margen, ubicacion, alturaMaxima });
  }

  function iniciarMantenerMensaje(evento, idMensaje, alinearDerecha) {
    if (evento.pointerType !== 'touch') return;
    pulsacionLarga.current = false;
    window.clearTimeout(timerMantenerMensaje.current);
    const elemento = evento.currentTarget;
    timerMantenerMensaje.current = window.setTimeout(() => {
      pulsacionLarga.current = true;
      abrirMenuMensaje(elemento, idMensaje, alinearDerecha);
    }, 500);
  }

  function cancelarMantenerMensaje() {
    window.clearTimeout(timerMantenerMensaje.current);
  }

  async function alternarFijado(mensaje) {
    try {
      await api.fijarMensajeChat(club.id_club, mensaje.id_mensaje, !mensaje.fijado);
      await sincronizar(); setMenuMensaje(null);
    } catch (err) { setError(err.message || 'No se pudo actualizar el mensaje fijado.'); }
  }

  async function alternarSilencio(miembro, duracionMinutos = null) {
    try {
      await api.silenciarMiembroChat(club.id_club, miembro.id_usuario, !miembro.silenciado, duracionMinutos);
      setMenuSilencioId(null);
      await sincronizar();
    } catch (err) { setError(err.message || 'No se pudo actualizar el silencio.'); }
  }

  function iniciarEdicion(mensaje) {
    setEditarId(mensaje.id_mensaje);
    setTexto(mensaje.contenido);
    setMenciones((mensaje.menciones || []).map((m) => ({ id: m.id_usuario, token: `@${m.nombre}` })));
    setMenuMensaje(null);
    inputRef.current?.focus();
  }

  function irAlFinal() {
    pegadoAlFinal.current = true;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    setMensajesNuevos(0);
    void marcarChatLeido();
  }

  function alDesplazar() {
    const panel = scrollRef.current;
    if (!panel) return;
    pegadoAlFinal.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 80;
    if (pegadoAlFinal.current && mensajesNuevos) {
      setMensajesNuevos(0);
      void marcarChatLeido();
    }
  }

  const superficie = temaClaro ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0e162c] border-slate-700/70 text-white';
  const secundaria = temaClaro ? 'text-slate-500' : 'text-slate-400';
  const campo = temaClaro ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-[#111b33] border-slate-700 text-white placeholder:text-slate-500';

  if (cargando) return <div className={`chat-club ${superficie} flex min-h-64 items-center justify-center rounded-2xl border`}><span className="chat-club__spinner" aria-label="Cargando chat" /></div>;
  if (!chat) return <div className={`rounded-2xl border p-5 ${superficie}`} role="alert">{error || 'No se pudo abrir el chat del club.'}</div>;

  const mensajeMenu = menuMensaje && chat.mensajes.find((mensaje) => Number(mensaje.id_mensaje) === Number(menuMensaje.id));
  return <section ref={chatRef} className={`chat-club ${ocuparPantalla ? 'chat-club--pantalla' : ''} ${superficie} relative flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm`} aria-label={`Chat de ${club.nombre_club}`}>
    <header className={`chat-club__header flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5 ${temaClaro ? 'border-slate-200' : 'border-slate-700/70'}`}>
      <div className="min-w-0">
        <h2 className="truncate text-base font-black md:text-lg">{club.nombre_club}</h2>
        <p className={`text-xs ${secundaria}`}>Chat del club · {conectados.length} conectados</p>
      </div>
      <button type="button" className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${temaClaro ? 'border-slate-200 hover:bg-slate-50' : 'border-slate-700 hover:bg-slate-800'}`} onClick={() => setMiembrosAbiertos(true)}>
        <Icono nombre="users" className="h-4 w-4" /> Miembros <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500">{conectados.length}</span>
      </button>
    </header>

    {!!fijados.length && <div className={`chat-club__fijados border-b ${temaClaro ? 'border-slate-200 bg-amber-50/70' : 'border-slate-700/70 bg-amber-400/5'}`}>
      <button type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left" aria-expanded={fijadosAbiertos} onClick={() => setFijadosAbiertos((v) => !v)}>
        <span className="flex items-center gap-2 text-sm font-bold text-amber-500"><Icono nombre="star" className="h-4 w-4" /> Mensajes fijados ({fijados.length})</span>
        <Icono nombre={fijadosAbiertos ? 'chevron-up' : 'chevron-down'} className="h-4 w-4" />
      </button>
      {fijadosAbiertos && <div className="space-y-2 px-4 pb-3">{fijados.map((f) => <div key={f.id_mensaje} className="text-sm"><span className="font-bold text-amber-500">{f.autor}: </span><span>{leerStickerUriel(f.contenido) ? `Sticker de Uriel · ${leerStickerUriel(f.contenido).frase}` : f.contenido}</span></div>)}</div>}
    </div>}

    <div className="relative flex min-h-0 flex-1">
      <div ref={scrollRef} onScroll={alDesplazar} className={`chat-club__mensajes min-w-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 md:space-y-3 md:px-5 md:py-4 ${miembrosAbiertos ? 'lg:pr-4' : ''}`}>
        {chat.mas_anteriores && <div className="flex justify-center"><button type="button" onClick={cargarAnteriores} disabled={cargandoAnteriores} aria-busy={cargandoAnteriores} className="rounded-full px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-400/10 disabled:cursor-wait disabled:opacity-60">{cargandoAnteriores ? 'Cargando mensajes…' : 'Cargar mensajes anteriores'}</button></div>}
        {chat.mensajes.length === 0 && <div className={`grid min-h-64 place-content-center text-center ${secundaria}`}><p className="font-semibold">Este es el inicio del chat</p><p className="mt-1 text-sm">Envía un mensaje para comenzar la conversación.</p></div>}
        {chat.mensajes.map((mensaje) => {
          const mio = Number(mensaje.id_autor) === miId;
          const stickerMensaje = mensaje.eliminado ? null : leerStickerUriel(mensaje.contenido);
          return <article key={mensaje.id_mensaje}
            data-chat-mensaje
            onPointerDown={(evento) => iniciarMantenerMensaje(evento, mensaje.id_mensaje, mio)}
            onPointerUp={cancelarMantenerMensaje}
            onPointerCancel={cancelarMantenerMensaje}
            onPointerLeave={cancelarMantenerMensaje}
            onClick={() => {
              if (pulsacionLarga.current) { pulsacionLarga.current = false; return; }
              if (menuMensaje?.id === mensaje.id_mensaje) setMenuMensaje(null);
            }}
            onContextMenu={(evento) => { evento.preventDefault(); abrirMenuMensaje(evento.currentTarget, mensaje.id_mensaje, mio); }}
            className={`chat-club__mensaje group relative w-fit max-w-[92%] rounded-2xl ${stickerMensaje ? 'px-1 py-1' : 'px-3 py-2'} ${menuMensaje?.id === mensaje.id_mensaje ? 'chat-club__mensaje--seleccionado' : ''} ${stickerMensaje ? 'bg-transparent' : mio ? (temaClaro ? 'bg-amber-50' : 'bg-[#182440]') : (temaClaro ? 'bg-slate-50' : 'bg-[#111a2f]')} ${mio ? 'ml-auto' : ''}`}>
            <button
              type="button"
              className={`chat-club__menu-toggle hidden md:grid ${temaClaro ? 'chat-club__menu-toggle--claro' : 'chat-club__menu-toggle--oscuro'}`}
              aria-label={`Opciones del mensaje de ${mensaje.autor}`}
              title="Opciones del mensaje"
              aria-haspopup="menu"
              onPointerDown={(evento) => evento.stopPropagation()}
              onClick={(evento) => {
                evento.stopPropagation();
                if (menuMensaje?.id === mensaje.id_mensaje) setMenuMensaje(null);
                else abrirMenuMensaje(evento.currentTarget.closest('[data-chat-mensaje]'), mensaje.id_mensaje, mio);
              }}
            >
              <Icono nombre="chevron-down" className="h-4 w-4" />
            </button>
            <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
              {!mio && <span className={nombreClase(mensaje, chat.club)}>{mensaje.autor}</span>}
              {!mio && mensaje.es_vicepresidente && <span className="chat-club__rol chat-club__rol--vicepresidente">Vicepresidente</span>}
            </div>
            <div className="chat-club__mensaje-contenido flex min-w-0 items-end gap-x-2">
              {stickerMensaje ? <UrielSticker id={stickerMensaje.id} /> : <p className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-snug ${mensaje.eliminado ? `italic ${secundaria}` : ''}`}>{renderContenido(mensaje.contenido, mensaje.menciones)}</p>}
              <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] leading-tight ${secundaria}`}>
                {mensaje.editado_en && <span className="text-[9px]">(editado)</span>}
                <time dateTime={mensaje.creado_en}>{new Date(mensaje.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</time>
              </span>
            </div>
            {!mensaje.eliminado && <div className="mt-2 flex flex-wrap items-center gap-1">
              {(mensaje.reacciones || []).map((reaccion) => <button key={reaccion.emoji} type="button" disabled={Boolean(reaccionPendiente) || silenciado} onClick={() => void alternarReaccion(mensaje.id_mensaje, reaccion.emoji)} aria-label={`${reaccion.emoji}: ${reaccion.total} reacciones${reaccion.mia ? ', quitar mi reacción' : ', reaccionar'}`} aria-pressed={reaccion.mia} className={`rounded-full border px-2 py-0.5 text-xs transition disabled:opacity-50 ${reaccion.mia ? 'border-amber-400 bg-amber-400/20' : 'border-slate-400/30 hover:border-amber-400'}`}>{reaccion.emoji} <span className="tabular-nums">{reaccion.total}</span></button>)}
              <button type="button" disabled={silenciado} onClick={() => setSelectorReaccion(selectorReaccion === mensaje.id_mensaje ? null : mensaje.id_mensaje)} aria-label={`Reaccionar al mensaje de ${mensaje.autor}`} aria-expanded={selectorReaccion === mensaje.id_mensaje} className="rounded-full border border-slate-400/30 px-2 py-0.5 text-xs hover:border-amber-400 disabled:opacity-50">＋ 😊</button>
              {selectorReaccion === mensaje.id_mensaje && <div className="flex max-w-64 flex-wrap gap-1 rounded-xl border border-amber-400/30 bg-white p-1.5 shadow-lg dark:bg-[#182440]">{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => void alternarReaccion(mensaje.id_mensaje, emoji)} className="rounded-lg p-1 text-lg hover:bg-amber-400/20" aria-label={`Reaccionar con ${emoji}`}>{emoji}</button>)}</div>}
            </div>}
          </article>;
        })}
        {!!escribiendo.length && <p className={`px-2 text-xs ${secundaria}`} aria-live="polite"><span className="chat-club__puntos" />{escribiendo.length === 1 ? `${escribiendo[0].nombre_completo} está escribiendo…` : `${escribiendo.length} personas están escribiendo…`}</p>}
      </div>

      {miembrosAbiertos && <>
        <button type="button" className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-label="Cerrar miembros" onClick={() => setMiembrosAbiertos(false)} />
        <aside className={`chat-club__miembros z-40 flex flex-col border-l ${temaClaro ? 'border-slate-200 bg-white' : 'border-slate-700/70 bg-[#0b1428]'}`}>
          <div className={`flex items-center justify-between border-b px-4 py-3 ${temaClaro ? 'border-slate-200' : 'border-slate-700/70'}`}>
            <div><h3 className="font-black">Miembros</h3><p className={`text-xs ${secundaria}`}>{miembros.length} en el club</p></div>
            <button type="button" className="rounded-lg p-2 hover:bg-slate-500/10" onClick={() => setMiembrosAbiertos(false)} aria-label="Cerrar miembros"><Icono nombre="close" className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {['Conectados', 'Desconectados'].map((grupo) => {
              const lista = miembros.filter((m) => Boolean(m.conectado) === (grupo === 'Conectados'));
              if (!lista.length) return null;
              return <div key={grupo} className="mb-4"><h4 className={`mb-2 px-2 text-[11px] font-black uppercase tracking-wider ${secundaria}`}>{grupo} — {lista.length}</h4>
                <div className="space-y-1">{lista.map((m) => <div key={m.id_usuario} className={`rounded-xl px-2 py-2 ${temaClaro ? 'hover:bg-slate-50' : 'hover:bg-slate-800/60'}`}>
                  <div className="flex items-center gap-2">
                    <span className="relative grid h-8 w-8 shrink-0 place-content-center rounded-full bg-amber-500 text-xs font-black text-white">{m.nombre_completo?.charAt(0) || '?'}<i className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 ${temaClaro ? 'border-white' : 'border-[#0b1428]'} ${m.conectado ? 'bg-emerald-500' : 'bg-slate-500'}`} /></span>
                    <div className="min-w-0 flex-1"><p className={`${nombreClase(m, chat.club)} truncate text-sm`}>{m.nombre_completo}</p><p className={`text-[10px] ${secundaria}`}>{m.es_responsable ? 'Responsable' : m.es_vicepresidente ? 'Vicepresidente' : m.escribiendo ? 'Está escribiendo…' : m.conectado ? 'Conectado' : 'Desconectado'}</p></div>
                    {esResponsable && !m.es_responsable && !m.es_vicepresidente && <button type="button" className={`text-xs font-bold ${m.silenciado ? 'text-amber-500' : secundaria}`} onClick={() => m.silenciado ? alternarSilencio(m) : setMenuSilencioId((id) => id === m.id_usuario ? null : m.id_usuario)} title={m.silenciado ? 'Reactivar' : 'Opciones de silencio'}>{m.silenciado ? 'Reactivar' : 'Silenciar'}</button>}
                  </div>
                  {esResponsable && !m.es_responsable && !m.es_vicepresidente && menuSilencioId === m.id_usuario && <div className={`mt-2 rounded-lg border p-2 ${temaClaro ? 'border-slate-200 bg-white' : 'border-slate-700 bg-[#0e162c]'}`}>
                    <p className={`mb-2 text-[10px] font-bold ${secundaria}`}>Silenciar durante…</p>
                    <div className="flex flex-wrap gap-2">
                      {[['1 hora', 60], ['24 horas', 1440], ['7 días', 10080], ['Sin límite', null]].map(([etiqueta, minutos]) => <button key={etiqueta} type="button" className="rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-500 hover:bg-amber-400/20" onClick={() => alternarSilencio(m, minutos)}>{etiqueta}</button>)}
                      <button type="button" className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${secundaria}`} onClick={() => setMenuSilencioId(null)}>Cancelar</button>
                    </div>
                  </div>}
                </div>)}</div>
              </div>;
            })}
          </div>
        </aside>
      </>}
    </div>

    {!!mensajesNuevos && <button type="button" onClick={irAlFinal} className="chat-club__nuevos">{mensajesNuevos} mensajes nuevos · Ir al final</button>}
    {error && <p className="px-4 pb-2 text-xs text-red-500" role="alert">{error}</p>}

    <form className={`chat-club__composer relative p-3 md:p-4`} onSubmit={enviar}>
      {seleccionMencion != null && candidatosMencion.length > 0 && <div className={`chat-club__sugerencias absolute bottom-full left-3 z-20 mb-2 max-h-52 w-[min(24rem,calc(100%-1.5rem))] overflow-y-auto rounded-xl border shadow-xl ${superficie}`}>
        {candidatosMencion.map((m) => <button type="button" key={m.id_usuario} onMouseDown={(e) => e.preventDefault()} onClick={() => insertarMencion(m)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-400/10 ${nombreClase(m, chat.club)}`}><span className="grid h-7 w-7 place-content-center rounded-full bg-amber-500 text-xs text-white">{m.nombre_completo.charAt(0)}</span>{m.nombre_completo}</button>)}
      </div>}
      <div className={`chat-club__composer-bar flex items-end gap-2 rounded-full border px-2 py-1.5 ${campo}`}>
        <button type="button" onClick={() => { setSelectorSticker(false); setSelectorEmoji((abierto) => !abierto); }} aria-label="Elegir emoji" aria-expanded={selectorEmoji} disabled={silenciado} className="grid h-10 w-10 shrink-0 place-content-center rounded-full text-xl hover:bg-amber-400/15 disabled:opacity-40">😊</button>
        <button type="button" onClick={() => { setSelectorEmoji(false); setSelectorSticker((abierto) => !abierto); }} aria-label="Stickers de Uriel" aria-expanded={selectorSticker} disabled={silenciado || Boolean(editarId)} className="grid h-10 w-10 shrink-0 place-content-center rounded-full text-xl hover:bg-amber-400/15 disabled:opacity-40">🐺</button>
        <textarea ref={inputRef} rows={1} value={texto} onChange={(e) => manejarTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar(e); } }} placeholder={chat.miembros.find((m) => Number(m.id_usuario) === miId)?.silenciado ? 'No puedes escribir en este chat' : `Mensaje para ${club.nombre_club}`} disabled={Boolean(chat.miembros.find((m) => Number(m.id_usuario) === miId)?.silenciado)} className="max-h-32 min-h-10 flex-1 resize-none overflow-y-hidden bg-transparent px-2 py-2 text-sm outline-none" aria-label="Escribe un mensaje" />
        <button type="submit" disabled={enviando || espera > 0 || !texto.trim() || Boolean(chat.miembros.find((m) => Number(m.id_usuario) === miId)?.silenciado)} className="grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-amber-400 text-[#0b111e] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Enviar mensaje" title={espera ? `Espera ${espera} segundos` : 'Enviar mensaje'}><Icono nombre="send" className="h-5 w-5" /></button>
      </div>
      {selectorEmoji && <div className={`absolute bottom-full left-3 z-20 mb-2 flex w-64 flex-wrap gap-1 rounded-xl border p-2 shadow-xl ${superficie}`} aria-label="Emojis para el mensaje">{EMOJIS.map((emoji) => <button key={emoji} type="button" onMouseDown={(evento) => evento.preventDefault()} onClick={() => insertarEmoji(emoji)} aria-label={`Insertar ${emoji}`} className="rounded-lg p-1 text-xl hover:bg-amber-400/20">{emoji}</button>)}</div>}
      {selectorSticker && <div className={`chat-club__stickers absolute bottom-full left-3 z-20 mb-2 w-[min(21rem,calc(100%-1.5rem))] rounded-2xl border border-amber-400/40 p-2.5 shadow-2xl ${superficie}`} aria-label="Stickers de Uriel">
        <p className="mb-2 px-1 text-xs font-black text-amber-600 dark:text-amber-300">Stickers de Uriel <span className={`font-medium ${secundaria}`}>· toca uno para enviarlo</span></p>
        <div className="grid grid-cols-3 gap-2">{STICKERS_URIEL.map((sticker) => <button key={sticker.id} type="button" onClick={() => void enviarSticker(sticker.id)} disabled={enviando || espera > 0 || silenciado} aria-label={`Enviar sticker de Uriel: ${sticker.frase}`} className="min-w-0 rounded-xl text-center focus-visible:outline-2 focus-visible:outline-amber-400 disabled:cursor-wait disabled:opacity-50"><UrielSticker id={sticker.id} compacto /></button>)}</div>
      </div>}
      {(editarId || espera > 0 || Array.from(texto).length >= 350) && <div className="mt-1 flex items-center justify-between gap-2 px-2">
        {(editarId || espera > 0) && <p className={`text-[10px] ${secundaria}`}>{editarId ? 'Editando mensaje' : `Puedes enviar otro mensaje en ${espera} s`}</p>}
        {Array.from(texto).length >= 350 && <p className={`text-[11px] font-bold ${Array.from(texto).length >= 390 ? 'text-amber-500' : secundaria}`}>{Array.from(texto).length} / {MAX_CARACTERES}</p>}
      </div>}
      {editarId && <button type="button" className="mt-1 px-2 text-xs font-bold text-slate-500 underline" onClick={() => { setEditarId(null); setTexto(''); setMenciones([]); }}>Cancelar edición</button>}
    </form>
    {menuMensaje && mensajeMenu && !mensajeMenu.eliminado && createPortal(
      <div
        data-chat-acciones
        className={`chat-club__menu-acciones ${temaClaro ? 'chat-club__menu-acciones--claro' : 'chat-club__menu-acciones--oscuro'}`}
        style={{ left: menuMensaje.izquierda, top: menuMensaje.vertical, maxHeight: `${menuMensaje.alturaMaxima}px`, transform: menuMensaje.ubicacion === 'arriba' ? 'translateY(-100%)' : 'none' }}
        role="menu"
        aria-label="Acciones del mensaje"
      >
        {Number(mensajeMenu.id_autor) === miId && !leerStickerUriel(mensajeMenu.contenido) && <button type="button" role="menuitem" onClick={() => iniciarEdicion(mensajeMenu)}><Icono nombre="edit" className="h-4 w-4" />Editar</button>}
        {(Number(mensajeMenu.id_autor) === miId || esResponsable) && <button type="button" role="menuitem" onClick={() => borrarMensaje(mensajeMenu.id_mensaje)} className="chat-club__menu-acciones--eliminar"><Icono nombre="trash" className="h-4 w-4" />Eliminar</button>}
        {esResponsable && <button type="button" role="menuitem" onClick={() => alternarFijado(mensajeMenu)}><Icono nombre="star" className="h-4 w-4" />{mensajeMenu.fijado ? 'Desfijar mensaje' : 'Fijar mensaje'}</button>}
      </div>,
      document.body,
    )}
  </section>;
}
