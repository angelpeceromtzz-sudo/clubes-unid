import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export function SeleccionFinal({ club, tema, modoOscuro }) {
  const [convocados, setConvocados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [decisiones, setDecisiones] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const data = await api.getSolicitudesPendientes(club.id_club);
        const conv = data.filter((s) => s.status === 'Convocado');
        if (montado) {
          setConvocados(conv);
          setDecisiones({});
        }
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  function toggleDecision(id) {
    setDecisiones((prev) => {
      if (prev[id] === 'aprobado') {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      }
      return { ...prev, [id]: 'aprobado' };
    });
  }

  const aprobados = Object.entries(decisiones)
    .filter((entry) => entry[1] === 'aprobado')
    .map((entry) => parseInt(entry[0], 10));
  const rechazados = convocados.filter((c) => !decisiones[c.id_formulario]);

  async function enviarOfertas() {
    setEnviando(true);
    setError('');
    try {
      await api.enviarOfertas(club.id_club, aprobados);
      setCompletado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (completado) {
    return (
      <div className={`rounded-2xl p-8 border text-center ${modoOscuro ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className={`text-lg font-black uppercase tracking-wider mb-2 ${modoOscuro ? 'text-emerald-300' : 'text-emerald-700'}`}>
          Ofertas enviadas
        </h3>
        <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          {aprobados.length} alumno{aprobados.length !== 1 ? 's' : ''} recibirá{aprobados.length === 1 ? '' : 'n'} oferta{aprobados.length !== 1 ? 's' : ''} de ingreso.
          {rechazados.length > 0 && ` ${rechazados.length} alumno${rechazados.length !== 1 ? 's' : ''} notificado${rechazados.length !== 1 ? 's' : ''} como no seleccionado${rechazados.length !== 1 ? 's' : ''}.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-black uppercase tracking-wider mb-1 ${tema.title}`}>
          Selección Final
        </h2>
        <p className={`text-sm ${tema.subtitle}`}>
          Marca a los alumnos que aprobaron la evaluación presencial. Al enviar, recibirán una oferta de ingreso.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {convocados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium">No hay alumnos convocados</p>
          <p className="text-xs mt-0.5">Los alumnos aparecerán aquí una vez que hayan sido convocados a evaluación presencial.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
                {convocados.length} alumno{convocados.length !== 1 ? 's' : ''} convocado{convocados.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-slate-500">
                · {aprobados.length} aprobado{aprobados.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {convocados.map((alumno) => {
              const esAprobado = decisiones[alumno.id_formulario] === 'aprobado';
              return (
                <div
                  key={alumno.id_formulario}
                  onClick={() => toggleDecision(alumno.id_formulario)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all active:scale-[0.99] ${
                    esAprobado
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : modoOscuro
                        ? 'bg-[#0e162c] border-slate-700/50 hover:border-slate-600/50'
                        : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        esAprobado
                          ? 'bg-emerald-500 border-emerald-500'
                          : modoOscuro ? 'border-slate-600' : 'border-slate-400'
                      }`}
                    >
                      {esAprobado && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                      {alumno.nombre_completo.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                        {alumno.nombre_completo}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{alumno.matricula} · {alumno.carrera}</p>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      esAprobado
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {esAprobado ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {aprobados.length > 0 && (
            <button
              onClick={enviarOfertas}
              disabled={enviando}
              className="w-full bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-6 py-4 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {enviando ? (
                <span className="animate-spin w-5 h-5 border-2 border-[#0e162c] border-t-transparent rounded-full" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Enviar ofertas ({aprobados.length})
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
