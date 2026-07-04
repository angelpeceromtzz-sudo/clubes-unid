import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { AvatarInicial } from '../ui/AvatarInicial';
import { Alerta } from '../ui/Alerta';
import { Badge } from '../ui/Badge';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';
import { PantallaCompletado } from '../ui/PantallaCompletado';

export function SeleccionFinal({ club }) {
  const { tema, modoOscuro } = useTheme();
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
    return <Spinner />;
  }

  if (completado) {
    const descripcion = `${aprobados.length} alumno${aprobados.length !== 1 ? 's' : ''} recibirá${aprobados.length === 1 ? '' : 'n'} oferta${aprobados.length !== 1 ? 's' : ''} de ingreso.${rechazados.length > 0 ? ` ${rechazados.length} alumno${rechazados.length !== 1 ? 's' : ''} notificado${rechazados.length !== 1 ? 's' : ''} como no seleccionado${rechazados.length !== 1 ? 's' : ''}.` : ''}`;
    return <PantallaCompletado icono="check-circle" titulo="Ofertas enviadas" descripcion={descripcion} />;
  }

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Selección Final"
        subtitulo="Marca a los alumnos que aprobaron la evaluación presencial. Al enviar, recibirán una oferta de ingreso."
      />

      {error && <Alerta tipo="error" mensaje={error} />}

      {convocados.length === 0 ? (
        <EmptyState icono="users" titulo="No hay alumnos convocados" descripcion="Los alumnos aparecerán aquí una vez que hayan sido convocados a evaluación presencial." />
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
                        <Icono nombre="check" className="h-4 w-4 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <AvatarInicial nombre={alumno.nombre_completo} color="amber" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                        {alumno.nombre_completo}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{alumno.matricula} · {alumno.carrera}</p>
                    </div>
                    <Badge texto={esAprobado ? 'Aprobado' : 'Rechazado'} color={esAprobado ? 'emerald' : 'red'} />
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
                <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
              ) : (
                <>
                  <Icono nombre="check-circle" className="h-5 w-5" strokeWidth={2.5} />
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
