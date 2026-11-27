import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api, request } from '../../../services/api';
import { ModalBase } from '../../ui/ModalBase';
import { BotonCerrar } from '../../ui/BotonCerrar';
import { Alerta } from '../../ui/Alerta';
import { Icono } from '../../ui/Icono';

const TIPOS = ['texto', 'textarea', 'numero', 'seleccion', 'fecha'];

const TIPO_LABEL = {
  texto: 'Texto corto',
  textarea: 'Texto largo',
  numero: 'Número',
  seleccion: 'Selección múltiple',
  fecha: 'Fecha',
};

const nuevaVacia = () => ({ etiqueta: '', tipo: 'texto', opciones: [], obligatorio: false });

function GripIcono({ className = '' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="7" cy="4" r="1.6" />
      <circle cx="13" cy="4" r="1.6" />
      <circle cx="7" cy="10" r="1.6" />
      <circle cx="13" cy="10" r="1.6" />
      <circle cx="7" cy="16" r="1.6" />
      <circle cx="13" cy="16" r="1.6" />
    </svg>
  );
}

/* Vista del campo tal como lo verá el alumno (sólo lectura). */
function VistaCampo({ p, oscuro, textoTenue }) {
  const cajaBase = `rounded-lg border ${oscuro ? 'border-slate-700 bg-[#18223f]/70' : 'border-slate-200 bg-slate-50'}`;
  if (p.tipo === 'seleccion') {
    const opciones = Array.isArray(p.configuracion?.opciones) ? p.configuracion.opciones : [];
    if (opciones.length === 0) {
      return <p className={`text-xs italic ${textoTenue}`}>Sin opciones configuradas.</p>;
    }
    return (
      <div className="space-y-2">
        {opciones.map((o, i) => (
          <div key={`${o}-${i}`} className={`flex items-center gap-2.5 text-sm ${textoTenue}`}>
            <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${oscuro ? 'border-slate-600' : 'border-slate-300'}`} />
            <span className={oscuro ? 'text-slate-300' : 'text-slate-700'}>{o}</span>
          </div>
        ))}
      </div>
    );
  }
  if (p.tipo === 'textarea') {
    return <div className={`h-16 ${cajaBase}`} />;
  }
  const marcador = p.tipo === 'numero' ? 'Respuesta numérica' : p.tipo === 'fecha' ? 'dd/mm/aaaa' : 'Texto de respuesta';
  return (
    <div className={`flex h-9 items-center px-3 text-xs ${cajaBase} ${textoTenue}`}>
      {marcador}
    </div>
  );
}

/* Opciones de una pregunta de selección: una fila por opción, como en Forms. */
function ListaOpciones({ opciones, onChange, oscuro, textoTenue }) {
  const refs = useRef([]);
  const focoPendiente = useRef(null);

  // Enfoca la opción recién agregada sin mover el scroll de la página.
  useEffect(() => {
    const indice = focoPendiente.current;
    if (indice === null) return;
    focoPendiente.current = null;
    refs.current[indice]?.focus({ preventScroll: true });
  });

  const actualizar = (indice, valor) => {
    onChange(opciones.map((o, i) => (i === indice ? valor : o)));
  };

  const quitar = (indice) => {
    onChange(opciones.filter((_, i) => i !== indice));
  };

  const agregar = () => {
    focoPendiente.current = opciones.length;
    onChange([...opciones, '']);
  };

  return (
    <div className="space-y-1">
      {opciones.map((opcion, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={`h-[18px] w-[18px] shrink-0 rounded-full border-2 ${oscuro ? 'border-slate-600' : 'border-slate-300'}`} />
          <input
            ref={(el) => { refs.current[i] = el; }}
            value={opcion}
            onChange={(e) => actualizar(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                agregar();
              }
              if (e.key === 'Backspace' && !opcion && opciones.length > 1) {
                e.preventDefault();
                quitar(i);
              }
            }}
            placeholder={`Opción ${i + 1}`}
            className={`w-full border-0 border-b bg-transparent px-0 py-1.5 text-sm outline-none transition focus:border-amber-400 ${
              oscuro
                ? 'border-slate-700 text-slate-200 placeholder-slate-500'
                : 'border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
          <button
            type="button"
            onClick={() => quitar(i)}
            disabled={opciones.length === 1}
            title="Quitar opción"
            className="cursor-pointer rounded-lg p-1 text-slate-400 transition hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Icono nombre="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={agregar}
        className={`flex cursor-pointer items-center gap-2 pt-1 text-sm font-medium transition hover:text-amber-500 ${textoTenue}`}
      >
        <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${oscuro ? 'border-slate-600' : 'border-slate-300'}`}>
          <Icono nombre="plus" className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
        Agregar opción
      </button>
    </div>
  );
}

export function ModalConfigurarFormulario({ club, onClose }) {
  const { modoOscuro } = useTheme();
  const tema = modoOscuro ? 'dark' : 'light';
  const [preguntas, setPreguntas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [nueva, setNueva] = useState(nuevaVacia);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoDatos, setEditandoDatos] = useState(nuevaVacia);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [vista, setVista] = useState('preguntas');
  const reordenoRef = useRef(false);

  const idClub = club?.id_club || club?.id;
  const nombreClub = club?.nombre_club || club?.nombre || 'Club';

  const tarjetaCls = tema === 'dark' ? 'border-slate-700 bg-[#0e162c]' : 'border-slate-200 bg-white';
  const tarjetaPreguntaCls = tema === 'dark'
    ? 'border-slate-700 bg-[#0e162c]'
    : 'border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]';
  const lienzoCls = tema === 'dark' ? 'bg-[#0a1128]' : 'bg-[#f6f4fb]';
  const textoTenue = tema === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const textoFuerte = tema === 'dark' ? 'text-white' : 'text-slate-900';
  const selectCls = `cursor-pointer rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-amber-400/40 ${
    tema === 'dark'
      ? 'border-slate-700 bg-[#18223f] text-white'
      : 'border-slate-300 bg-white text-slate-900'
  }`;
  const etiquetaInputCls = `w-full border-0 border-b-2 border-amber-400 bg-transparent pb-1 text-base font-semibold outline-none ${
    tema === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
  }`;

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const data = await api.get(`/clubes/${idClub}/preguntas`);
      const lista = Array.isArray(data) ? data : [];
      setPreguntas(lista);
      if (lista.length === 0 && club?.categoria) {
        try {
          await request(`/clubes/${idClub}/preguntas/plantilla`, {
            method: 'POST',
            body: JSON.stringify({ categoria: club.categoria }),
          });
          const data2 = await api.get(`/clubes/${idClub}/preguntas`);
          setPreguntas(Array.isArray(data2) ? data2 : []);
        } catch {
          // Si falla, se deja vacío; el admin puede agregar manualmente.
        }
      }
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar las preguntas');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [idClub]);

  async function agregar() {
    if (!nueva.etiqueta.trim()) return;
    setGuardando(true);
    setError('');
    try {
      const configuracion = nueva.tipo === 'seleccion'
        ? { opciones: nueva.opciones.map((s) => s.trim()).filter(Boolean) }
        : {};
      const creada = await request(`/clubes/${idClub}/preguntas`, {
        method: 'POST',
        body: JSON.stringify({ etiqueta: nueva.etiqueta.trim(), tipo: nueva.tipo, configuracion, obligatorio: nueva.obligatorio }),
      });
      // Se agrega en memoria (sin recargar la lista) para no perder la posición
      // del scroll ni volver al inicio del formulario.
      if (creada?.id_pregunta) {
        setPreguntas((prev) => [...prev, creada]);
      }
      setNueva(nuevaVacia());
      setMostrarFormulario(false);
    } catch (e) {
      setError(e?.message || 'No se pudo agregar la pregunta');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(idPregunta) {
    try {
      await request(`/clubes/${idClub}/preguntas/${idPregunta}`, { method: 'DELETE' });
      setPreguntas((prev) => prev.filter((p) => p.id_pregunta !== idPregunta));
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar');
    }
  }

  async function alternarObligatoria(p) {
    const nuevoValor = !p.obligatorio;
    setPreguntas((prev) => prev.map((x) => (
      x.id_pregunta === p.id_pregunta ? { ...x, obligatorio: nuevoValor } : x
    )));
    try {
      await request(`/clubes/${idClub}/preguntas/${p.id_pregunta}`, {
        method: 'PUT',
        body: JSON.stringify({ obligatorio: nuevoValor }),
      });
    } catch (e) {
      setError(e?.message || 'No se pudo actualizar la pregunta');
      await cargar();
    }
  }

  function iniciarEdicion(p) {
    setEditandoId(p.id_pregunta);
    setEditandoDatos({
      etiqueta: p.etiqueta || '',
      tipo: p.tipo || 'texto',
      opciones: Array.isArray(p.configuracion?.opciones) ? [...p.configuracion.opciones] : [],
      obligatorio: Boolean(p.obligatorio),
    });
  }

  async function guardarEdicion(idPregunta) {
    setGuardandoEdicion(true);
    setError('');
    try {
      const configuracion = editandoDatos.tipo === 'seleccion'
        ? { opciones: editandoDatos.opciones.map((s) => s.trim()).filter(Boolean) }
        : {};
      const actualizada = await request(`/clubes/${idClub}/preguntas/${idPregunta}`, {
        method: 'PUT',
        body: JSON.stringify({ etiqueta: editandoDatos.etiqueta.trim(), tipo: editandoDatos.tipo, configuracion, obligatorio: editandoDatos.obligatorio }),
      });
      // Se reemplaza en memoria para conservar la posición del scroll.
      if (actualizada?.id_pregunta) {
        setPreguntas((prev) => prev.map((p) => (
          p.id_pregunta === actualizada.id_pregunta ? actualizada : p
        )));
      }
      setEditandoId(null);
    } catch (e) {
      setError(e?.message || 'No se pudo actualizar la pregunta');
    } finally {
      setGuardandoEdicion(false);
    }
  }

  // Drag & drop: sólo se inicia desde el asa, el resto de la tarjeta no arrastra.
  function onDragStart(e, index) {
    setDragIndex(index);
    reordenoRef.current = false;
    const li = e.currentTarget.closest('li');
    if (li && e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setDragImage(li, 24, 24); } catch { /* sin imagen de arrastre */ }
    }
  }

  function onDragOver(e, index) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordenadas = [...preguntas];
    const [movida] = reordenadas.splice(dragIndex, 1);
    reordenadas.splice(index, 0, movida);
    setPreguntas(reordenadas);
    setDragIndex(index);
    reordenoRef.current = true;
  }

  async function onDragEnd() {
    setDragIndex(null);
    if (!reordenoRef.current) return;
    reordenoRef.current = false;
    try {
      await Promise.all(preguntas.map((p, i) => (
        request(`/clubes/${idClub}/preguntas/${p.id_pregunta}`, {
          method: 'PUT',
          body: JSON.stringify({ orden: i + 1 }),
        })
      )));
    } catch (e) {
      setError(e?.message || 'No se pudo guardar el orden');
      await cargar();
    }
  }

  function cancelarNueva() {
    setMostrarFormulario(false);
    setNueva(nuevaVacia());
  }

  function renderVistaPrevia() {
    return (
      <div className="space-y-3">
        <div className={`rounded-xl border p-5 ${tarjetaCls}`}>
          <h3 className={`text-lg font-black ${textoFuerte}`}>{nombreClub}</h3>
          <p className={`mt-1 text-sm ${textoTenue}`}>
            Completa las siguientes preguntas para enviar tu postulación.
          </p>
        </div>
        {preguntas.map((p) => (
          <div key={p.id_pregunta} className={`rounded-xl border p-4 ${tarjetaCls}`}>
            <p className={`text-sm font-semibold ${textoFuerte}`}>
              {p.etiqueta}
              {p.obligatorio && <span className="ml-0.5 text-red-500">*</span>}
            </p>
            <div className="mt-2 opacity-80">
              <VistaCampo p={p} oscuro={modoOscuro} textoTenue={textoTenue} />
            </div>
          </div>
        ))}
        {preguntas.length === 0 && (
          <p className={`text-sm ${textoTenue}`}>Este formulario todavía no tiene preguntas.</p>
        )}
      </div>
    );
  }

  return (
    <ModalBase show={true} onClose={onClose} maxWidth="max-w-3xl">
      {/* Encabezado del formulario */}
      <div className={`overflow-hidden rounded-xl border ${tarjetaCls}`}>
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-500">
              Formulario de postulación
            </p>
            <h2 className={`truncate text-lg font-black sm:text-xl ${textoFuerte}`}>{nombreClub}</h2>
            <p className={`mt-0.5 text-xs ${textoTenue}`}>
              {club?.categoria ? `${club.categoria} · ` : ''}
              {preguntas.length} {preguntas.length === 1 ? 'pregunta' : 'preguntas'}
            </p>
          </div>
          <BotonCerrar onClick={onClose} etiqueta="Cerrar" />
        </div>
        <div className={`flex gap-1 border-t px-2 ${tema === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
          {[['preguntas', 'Preguntas'], ['preview', 'Vista previa']].map(([clave, etiqueta]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setVista(clave)}
              className={`relative cursor-pointer px-4 py-2.5 text-sm font-bold transition ${
                vista === clave
                  ? 'text-amber-600 dark:text-amber-400'
                  : `${textoTenue} hover:text-amber-500`
              }`}
            >
              {etiqueta}
              {vista === clave && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-amber-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mt-4"><Alerta tipo="error" mensaje={error} /></div>}

      {cargando ? (
        <p className={`mt-4 text-sm ${textoTenue}`}>Cargando preguntas…</p>
      ) : (
        <div className={`mt-4 rounded-2xl p-3 sm:p-4 ${lienzoCls}`}>
          {vista === 'preview' ? renderVistaPrevia() : (
            <ul className="space-y-3">
              {preguntas.map((p, index) => (
                <li
                  key={p.id_pregunta}
                  onDragOver={(e) => onDragOver(e, index)}
                  className={`group relative overflow-hidden rounded-xl border px-4 py-3.5 transition ${dragIndex === index ? 'opacity-50' : ''} ${tarjetaPreguntaCls} ${
                    editandoId === p.id_pregunta ? 'ring-2 ring-amber-400/50' : ''
                  }`}
                >
                  <span className={`absolute inset-y-0 left-0 w-1 bg-amber-400 transition-opacity ${
                    editandoId === p.id_pregunta ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`} />
                  {editandoId === p.id_pregunta ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <span className={`-ml-1 mt-0.5 shrink-0 rounded-lg p-1.5 ${tema === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>
                          <GripIcono className="h-5 w-5" />
                        </span>
                        <input
                          autoFocus
                          value={editandoDatos.etiqueta}
                          onChange={(e) => setEditandoDatos((d) => ({ ...d, etiqueta: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editandoDatos.etiqueta.trim()) guardarEdicion(p.id_pregunta);
                            if (e.key === 'Escape') setEditandoId(null);
                          }}
                          placeholder="Escribe tu pregunta"
                          className={etiquetaInputCls}
                        />
                      </div>
                      <div className="pl-7">
                        <select
                          value={editandoDatos.tipo}
                          onChange={(e) => setEditandoDatos((d) => ({
                            ...d,
                            tipo: e.target.value,
                            opciones: e.target.value === 'seleccion' && d.opciones.length === 0 ? [''] : d.opciones,
                          }))}
                          className={selectCls}
                        >
                          {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                        </select>
                        {editandoDatos.tipo === 'seleccion' && (
                          <div className="mt-3">
                            <ListaOpciones
                              opciones={editandoDatos.opciones}
                              onChange={(opciones) => setEditandoDatos((d) => ({ ...d, opciones }))}
                              oscuro={modoOscuro}
                              textoTenue={textoTenue}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pl-7">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => guardarEdicion(p.id_pregunta)}
                            disabled={guardandoEdicion || !editandoDatos.etiqueta.trim()}
                            className="cursor-pointer rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {guardandoEdicion ? 'Guardando…' : 'Guardar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className={`cursor-pointer rounded-lg border px-4 py-1.5 text-xs font-bold transition ${
                              tema === 'dark'
                                ? 'border-slate-600 text-slate-300 hover:bg-slate-700/50'
                                : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Cancelar
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditandoDatos((d) => ({ ...d, obligatorio: !d.obligatorio }))}
                          className={`flex cursor-pointer items-center gap-2 text-xs font-bold ${textoTenue}`}
                        >
                          Obligatoria
                          <span className={`relative h-5 w-9 rounded-full transition ${
                            editandoDatos.obligatorio ? 'bg-amber-500' : (tema === 'dark' ? 'bg-slate-700' : 'bg-slate-300')
                          }`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              editandoDatos.obligatorio ? 'left-[18px]' : 'left-0.5'
                            }`} />
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2">
                        <span
                          draggable
                          onDragStart={(e) => onDragStart(e, index)}
                          onDragEnd={onDragEnd}
                          title="Arrastrar para reordenar"
                          className={`-ml-1 mt-0.5 shrink-0 cursor-grab select-none rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-400/10 hover:text-amber-500 active:cursor-grabbing`}
                        >
                          <GripIcono className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className={`text-sm font-semibold sm:text-base ${textoFuerte}`}>
                            {p.etiqueta}
                            {p.obligatorio && <span className="ml-0.5 text-red-500">*</span>}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          tema === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {TIPO_LABEL[p.tipo] || p.tipo}
                        </span>
                      </div>

                      <div className="mt-3 pl-7">
                        <VistaCampo p={p} oscuro={modoOscuro} textoTenue={textoTenue} />
                      </div>

                      <div className={`mt-3 flex items-center justify-between border-t pt-2 pl-7 ${
                        tema === 'dark' ? 'border-slate-700/70' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => iniciarEdicion(p)}
                            title="Editar pregunta"
                            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-400/10 hover:text-amber-500"
                          >
                            <Icono nombre="pencil" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(p.id_pregunta)}
                            title="Eliminar pregunta"
                            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Icono nombre="trash" className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => alternarObligatoria(p)}
                          aria-pressed={Boolean(p.obligatorio)}
                          className={`flex cursor-pointer items-center gap-2 text-xs font-bold ${textoTenue}`}
                        >
                          Obligatoria
                          <span className={`relative h-5 w-9 rounded-full transition ${
                            p.obligatorio ? 'bg-amber-500' : (tema === 'dark' ? 'bg-slate-700' : 'bg-slate-300')
                          }`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              p.obligatorio ? 'left-[18px]' : 'left-0.5'
                            }`} />
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}

              {/* Agregar pregunta (última tarjeta) */}
              <li className={`rounded-xl border-2 border-dashed px-4 py-3 transition ${
                tema === 'dark' ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-slate-50'
              } ${mostrarFormulario ? 'border-amber-400' : ''}`}>
                {!mostrarFormulario ? (
                  <button
                    type="button"
                    onClick={() => setMostrarFormulario(true)}
                    className="flex w-full cursor-pointer items-center gap-3 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                      <Icono nombre="plus" className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <span className={`text-sm font-bold ${textoFuerte}`}>Agregar pregunta</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
                        <Icono nombre="plus" className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <input
                          autoFocus
                          value={nueva.etiqueta}
                          onChange={(e) => setNueva((n) => ({ ...n, etiqueta: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && nueva.etiqueta.trim()) agregar();
                            if (e.key === 'Escape') cancelarNueva();
                          }}
                          placeholder="Escribe tu pregunta"
                          className={etiquetaInputCls}
                        />
                        <p className={`mt-1 text-[11px] ${textoTenue}`}>
                          Presiona Enter para agregar
                        </p>
                      </div>
                    </div>
                    <div className="pl-12">
                      <select
                        value={nueva.tipo}
                        onChange={(e) => setNueva((n) => ({
                          ...n,
                          tipo: e.target.value,
                          opciones: e.target.value === 'seleccion' && n.opciones.length === 0 ? [''] : n.opciones,
                        }))}
                        className={selectCls}
                      >
                        {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
                      </select>
                      {nueva.tipo === 'seleccion' && (
                        <div className="mt-3">
                          <ListaOpciones
                            opciones={nueva.opciones}
                            onChange={(opciones) => setNueva((n) => ({ ...n, opciones }))}
                            oscuro={modoOscuro}
                            textoTenue={textoTenue}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pl-12">
                      <button
                        type="button"
                        onClick={cancelarNueva}
                        className={`cursor-pointer rounded-lg border px-4 py-1.5 text-xs font-bold transition ${
                          tema === 'dark'
                            ? 'border-slate-600 text-slate-300 hover:bg-slate-700/50'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => setNueva((n) => ({ ...n, obligatorio: !n.obligatorio }))}
                        className={`flex cursor-pointer items-center gap-2 text-xs font-bold ${textoTenue}`}
                      >
                        Obligatoria
                        <span className={`relative h-5 w-9 rounded-full transition ${
                          nueva.obligatorio ? 'bg-amber-500' : (tema === 'dark' ? 'bg-slate-700' : 'bg-slate-300')
                        }`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                            nueva.obligatorio ? 'left-[18px]' : 'left-0.5'
                          }`} />
                        </span>
                      </button>
                    </div>
                    {guardando && <p className={`pl-12 text-[11px] ${textoTenue}`}>Guardando…</p>}
                  </div>
                )}
                </li>

              {preguntas.length === 0 && (
                <p className={`text-sm ${textoTenue}`}>Este formulario todavía no tiene preguntas.</p>
              )}
            </ul>
          )}
        </div>
      )}
    </ModalBase>
  );
}
