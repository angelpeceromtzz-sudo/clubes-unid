import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { request } from '../services/api-core';
import { ExpedienteChat } from './ExpedienteChat';
import { UrielAvatar } from './UrielAvatar';
import { ResultadoVisualChat, FuentesChat } from './ResultadoVisualChat';

const ejemplos = [
  '¿Cuántos clubes activos hay?',
  '¿Qué club tiene más miembros?',
  '¿Cuántos alumnos hay?',
];

function expresionDeRespuesta(resultado) {
  if (resultado.expediente) return 'orgullo';
  if (resultado.persona) return 'curiosidad';
  if (/^(no encontr[eé]|no hay|no tengo|faltan datos|para consultar)/i.test(resultado.respuesta || '')) return 'confusion';
  return 'feliz';
}

export function AsistenteFlotante() {
  const [abierto, setAbierto] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [expresion, setExpresion] = useState('saludo');
  const [contexto, setContexto] = useState(null);
  const listaRef = useRef(null);

  useEffect(() => {
    if (abierto && listaRef.current) listaRef.current.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
  }, [abierto, mensajes.length, cargando]);

  async function enviarTexto(texto) {
    const contenido = texto.trim();
    if (!contenido || cargando) return;
    setPregunta('');
    setMensajes(actual => [...actual, { rol: 'usuario', texto: contenido }]);
    setCargando(true);
    setExpresion('pensando');
    try {
      const historial = mensajes.slice(-6).map(({ rol, texto: anterior }) => ({ rol, texto: anterior }));
      const resultado = await request('/asistente/consultar', { method: 'POST', body: JSON.stringify({ pregunta: contenido, historial, contexto }) });
      const gesto = expresionDeRespuesta(resultado);
      setMensajes(actual => [...actual, { rol: 'asistente', texto: resultado.respuesta, expediente: resultado.expediente, persona: resultado.persona, visualizacion: resultado.visualizacion, fuentes: resultado.fuentes, gesto }]);
      setContexto(resultado.contexto || null);
      setExpresion(gesto);
    } catch (error) {
      setMensajes(actual => [...actual, { rol: 'asistente', texto: error.message || 'No pude responder en este momento.', gesto: 'preocupacion' }]);
      setExpresion('preocupacion');
    } finally {
      setCargando(false);
    }
  }

  function enviar(event) {
    event.preventDefault();
    void enviarTexto(pregunta);
  }

  async function abrirExpediente(persona) {
    if (cargando) return;
    setMensajes(actual => actual.map(mensaje => mensaje.persona?.id === persona.id ? { ...mensaje, persona: null } : mensaje));
    setCargando(true);
    setExpresion('pensando');
    try {
      const resultado = await request('/asistente/consultar', { method: 'POST', body: JSON.stringify({ accion: 'ver_expediente', idUsuario: persona.id }) });
      setMensajes(actual => [...actual, { rol: 'asistente', texto: resultado.respuesta, expediente: resultado.expediente, fuentes: resultado.fuentes, gesto: 'orgullo' }]);
      setContexto(resultado.contexto || null);
      setExpresion('orgullo');
    } catch (error) {
      setMensajes(actual => [...actual, { rol: 'asistente', texto: error.message || 'No pude abrir el expediente.', gesto: 'preocupacion' }]);
      setExpresion('preocupacion');
    } finally {
      setCargando(false);
    }
  }

  function descartarExpediente(mensaje) {
    setMensajes(actual => [...actual.map(item => item === mensaje ? { ...item, persona: null } : item), { rol: 'asistente', texto: 'Claro. Dime qué más te gustaría consultar.', gesto: 'saludo' }]);
    setExpresion('saludo');
  }

  return <div className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6">
    {abierto && <section aria-label="Chat con Uriel" className="mb-3 flex h-[min(82vh,720px)] w-[min(94vw,560px)] flex-col overflow-hidden rounded-2xl border border-amber-400/30 bg-white shadow-2xl dark:bg-[#0e162c]">
      <header className="flex items-center gap-3 border-b border-amber-400/20 bg-amber-50/60 px-4 py-3 dark:bg-[#0a1128]">
        <UrielAvatar expresion={cargando ? 'pensando' : expresion} tamano="header" />
        <div className="min-w-0 flex-1"><h2 className="font-black text-[#0e162c] dark:text-white">Uriel <span className="text-amber-600 dark:text-amber-400">· ClubsUNID</span></h2><p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />Tu asistente de consulta</p></div>
        <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar chat con Uriel" className="rounded-lg p-1 text-slate-600 hover:bg-amber-400/15 hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-amber-400 dark:text-slate-300 dark:hover:text-amber-300"><X size={20} /></button>
      </header>
      <div ref={listaRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {mensajes.length === 0 && <div className="rounded-2xl border border-amber-400/20 bg-amber-50/50 p-4 dark:bg-[#18223f]">
          <div className="flex items-center gap-3"><UrielAvatar expresion="saludo" tamano="bienvenida" decorativo={false} /><div><p className="font-black text-[#0e162c] dark:text-white">¡Hola! Soy Uriel.</p><p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">Puedo ayudarte a consultar clubes, actividades y expedientes. ¿Qué te gustaría saber?</p></div></div>
          <div className="mt-4 flex flex-wrap gap-2">{ejemplos.map(ejemplo => <button key={ejemplo} type="button" onClick={() => void enviarTexto(ejemplo)} className="rounded-full border border-amber-400/40 bg-white px-3 py-1.5 text-left text-xs font-medium text-[#0e162c] transition hover:border-amber-500 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-400 dark:bg-[#0e162c] dark:text-slate-200 dark:hover:bg-amber-400/10">{ejemplo}</button>)}</div>
        </div>}
        {mensajes.map((mensaje, indice) => mensaje.rol === 'usuario' ? <div key={indice} className="ml-10 rounded-2xl rounded-br-md bg-blue-600 p-3 text-sm text-white whitespace-pre-wrap">{mensaje.texto}</div> : <div key={indice} className="flex items-start gap-2.5">
          <UrielAvatar expresion={mensaje.gesto || 'feliz'} />
          <div className={`min-w-0 flex-1 rounded-2xl rounded-tl-md text-sm whitespace-pre-wrap ${mensaje.expediente ? 'text-slate-900 dark:text-white' : 'border border-amber-400/15 bg-amber-50/60 p-3 text-slate-900 dark:bg-[#18223f] dark:text-white'}`}>
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Uriel</span>
            {mensaje.texto}
            <ResultadoVisualChat visualizacion={mensaje.visualizacion} />
            {mensaje.persona && <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={cargando} onClick={() => void abrirExpediente(mensaje.persona)} className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-black text-[#0e162c] hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50">Ver expediente</button>
              <button type="button" onClick={() => descartarExpediente(mensaje)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:border-amber-400 dark:border-slate-600">Ahora no</button>
            </div>}
            {mensaje.expediente && <ExpedienteChat ficha={mensaje.expediente} />}
            <FuentesChat fuentes={mensaje.fuentes} />
          </div>
        </div>)}
        {cargando && <div className="flex items-center gap-2.5" role="status"><UrielAvatar expresion="pensando" /><div className="rounded-2xl rounded-tl-md border border-amber-400/15 bg-amber-50/60 px-3 py-2 text-xs text-slate-600 dark:bg-[#18223f] dark:text-slate-300">Uriel está pensando<span className="uriel-puntos" aria-hidden="true">…</span></div></div>}
      </div>
      <form onSubmit={enviar} className="flex gap-2 border-t border-amber-400/20 p-3">
        <input aria-label="Escribe tu pregunta para Uriel" value={pregunta} onChange={event => setPregunta(event.target.value)} maxLength={600} placeholder="Pregúntale a Uriel…" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 dark:border-slate-700 dark:bg-[#18223f] dark:text-white" />
        <button type="submit" disabled={cargando || !pregunta.trim()} aria-label="Enviar pregunta a Uriel" className="rounded-lg bg-amber-400 px-3 text-[#0e162c] hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50"><Send size={18} /></button>
      </form>
    </section>}
    <button type="button" onClick={() => setAbierto(valor => !valor)} aria-label={abierto ? 'Cerrar chat con Uriel' : 'Abrir chat con Uriel'} className="relative ml-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/50 bg-[#0e162c] shadow-lg shadow-slate-900/20 transition hover:scale-105 hover:bg-[#18223f] focus-visible:outline-2 focus-visible:outline-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300"><UrielAvatar expresion={cargando ? 'pensando' : expresion} tamano="boton" /><span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#0e162c]" aria-hidden="true" /></button>
  </div>;
}
