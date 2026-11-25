import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLicenciaturas } from '../../hooks/useLicenciaturas';

const GRUPOS_MODALIDAD = [
  ['escolarizada', 'Escolarizadas'],
  ['ejecutiva', 'Ejecutivas'],
  ['dual', 'Duales'],
  ['maestria', 'Maestrías'],
];

function normalizarTexto(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

export function PasoLicenciatura({ valor, onCambiar }) {
  const { modoOscuro } = useTheme();
  const { licenciaturas, loading, error } = useLicenciaturas();
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const selectorRef = useRef(null);
  const busquedaRef = useRef(null);
  const textoSecundario = modoOscuro ? 'text-slate-400' : 'text-slate-600';
  const opcion = licenciaturas.find((licenciatura) => Number(licenciatura.id_licenciatura) === Number(valor));

  const grupos = useMemo(() => {
    const consulta = normalizarTexto(busqueda.trim());
    return GRUPOS_MODALIDAD.map(([modalidad, nombre]) => ({
      modalidad,
      nombre,
      opciones: licenciaturas.filter((licenciatura) => (
        licenciatura.modalidad === modalidad
        && (!consulta || normalizarTexto(licenciatura.nombre).includes(consulta))
      )),
    })).filter((grupo) => grupo.opciones.length > 0);
  }, [busqueda, licenciaturas]);

  useEffect(() => {
    if (!abierto) return undefined;
    busquedaRef.current?.focus();
    const cerrarConEscape = (evento) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    const cerrarFuera = (evento) => {
      if (!selectorRef.current?.contains(evento.target)) setAbierto(false);
    };
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, [abierto]);

  function seleccionar(licenciatura) {
    onCambiar(Number(licenciatura.id_licenciatura));
    setAbierto(false);
    setBusqueda('');
  }

  return (
    <div>
      <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
        ¿Cuál es tu licenciatura?
      </h2>
      <p className={`mt-2 text-sm ${textoSecundario}`}>
        Selecciona el programa en el que estás inscrito. Se usará para auto-rellenar tus postulaciones.
      </p>

      {loading && <p className={`mt-6 text-sm ${textoSecundario}`}>Cargando licenciaturas…</p>}
      {error && <p className="mt-6 text-sm text-red-400">No se pudieron cargar las licenciaturas.</p>}

      {!loading && !error && (
        <div className="relative mt-6" ref={selectorRef}>
          <label id="licenciatura-label" className={`mb-1 block text-xs font-bold uppercase tracking-wider ${textoSecundario}`}>
            Licenciatura
          </label>
          <button
            type="button"
            aria-labelledby="licenciatura-label"
            aria-controls="selector-licenciatura"
            aria-haspopup="dialog"
            aria-expanded={abierto}
            onClick={() => setAbierto((actual) => !actual)}
            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${
              modoOscuro ? 'border-slate-700 bg-[#18223f] text-white hover:border-slate-500' : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400'
            }`}
          >
            <span className={`min-w-0 truncate ${opcion ? '' : textoSecundario}`}>
              {opcion?.nombre ?? 'Selecciona tu licenciatura'}
            </span>
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}>
              <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {abierto && (
            <>
              <button
                type="button"
                aria-label="Cerrar selector de licenciatura"
                onClick={() => setAbierto(false)}
                className="fixed inset-0 z-[70] bg-black/55 sm:hidden"
              />
              <div
                id="selector-licenciatura"
                role="dialog"
                aria-label="Elige tu licenciatura"
                className={`fixed inset-x-3 top-1/2 z-[71] mx-auto flex max-h-[82dvh] max-w-lg -translate-y-1/2 flex-col overflow-hidden rounded-2xl border shadow-2xl sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 sm:max-h-80 sm:max-w-none sm:translate-y-0 ${
                  modoOscuro ? 'border-slate-700 bg-[#0e162c] text-white' : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <div className={`border-b p-3 ${modoOscuro ? 'border-slate-700' : 'border-slate-200'}`}>
                  <label className="sr-only" htmlFor="buscar-licenciatura">Buscar licenciatura</label>
                  <div className={`flex items-center gap-2 rounded-lg border px-3 ${modoOscuro ? 'border-slate-700 bg-[#18223f]' : 'border-slate-300 bg-slate-50'}`}>
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 shrink-0 ${textoSecundario}`}>
                      <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" />
                      <path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    <input
                      id="buscar-licenciatura"
                      ref={busquedaRef}
                      type="search"
                      value={busqueda}
                      onChange={(evento) => setBusqueda(evento.target.value)}
                      placeholder="Busca tu licenciatura"
                      className={`min-w-0 flex-1 bg-transparent py-3 text-sm outline-none ${modoOscuro ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'}`}
                    />
                    <button type="button" onClick={() => setAbierto(false)} className={`rounded-md px-2 py-1 text-xs font-bold sm:hidden ${textoSecundario}`}>
                      Cerrar
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="listbox" aria-labelledby="licenciatura-label">
                  {grupos.length === 0 ? (
                    <p className={`px-3 py-8 text-center text-sm ${textoSecundario}`}>No encontramos licenciaturas con ese nombre.</p>
                  ) : grupos.map((grupo) => (
                    <section key={grupo.modalidad} aria-label={grupo.nombre}>
                      <h3 className={`sticky top-0 z-10 px-3 py-2 text-[11px] font-black uppercase tracking-wider ${modoOscuro ? 'bg-[#0e162c] text-amber-400' : 'bg-white text-amber-700'}`}>
                        {grupo.nombre}
                      </h3>
                      {grupo.opciones.map((licenciatura) => {
                        const seleccionada = Number(licenciatura.id_licenciatura) === Number(valor);
                        return (
                          <button
                            key={licenciatura.id_licenciatura}
                            type="button"
                            role="option"
                            aria-selected={seleccionada}
                            onClick={() => seleccionar(licenciatura)}
                            className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${
                              seleccionada
                                ? 'bg-amber-400/15 text-amber-500'
                                : modoOscuro ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{licenciatura.nombre}</span>
                            {seleccionada && <span aria-hidden="true" className="shrink-0 font-bold">✓</span>}
                          </button>
                        );
                      })}
                    </section>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
