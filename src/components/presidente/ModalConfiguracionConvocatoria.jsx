import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Alerta } from '../ui/Alerta';
import { Icono } from '../ui/Icono';

function BadgeEstado({ estado }) {
  if (estado === 'abierta') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
        <Icono nombre="check-circle" strokeWidth={2} className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Abierta</span>
      </div>
    );
  }
  if (estado === 'cerrada_por_limite') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-400">
        <Icono nombre="alert-triangle" strokeWidth={2} className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Cerrada por límite</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400">
      <Icono nombre="close" strokeWidth={2} className="h-4 w-4" />
      <span className="text-sm font-bold uppercase tracking-wider">Cerrada</span>
    </div>
  );
}

export function ModalConfiguracionConvocatoria({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [config, setConfig] = useState({ estado_convocatoria: 'cerrada_manual', max_postulaciones: null, postulaciones_actuales: 0 });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    let montado = true;
    async function cargar() {
      try {
        const data = await api.getConvocatoriaClub(club.id_club);
        if (montado) setConfig(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  async function guardar(options = {}) {
    setGuardando(true);
    setError('');
    setExito('');
    try {
      const data = await api.actualizarConfiguracionConvocatoria(club.id_club, {
        estado: config.estado_convocatoria,
        max_postulaciones: config.max_postulaciones,
        ...options,
      });
      setConfig(data);
      setExito('Configuración guardada correctamente');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function toggleEstado() {
    const nuevoEstado = config.estado_convocatoria === 'abierta' ? 'cerrada_manual' : 'abierta';
    setConfig((p) => ({ ...p, estado_convocatoria: nuevoEstado }));
    await guardar({ estado: nuevoEstado });
  }

  async function reiniciarPeriodo() {
    setExito('');
    setError('');
    setGuardando(true);
    try {
      const data = await api.actualizarConfiguracionConvocatoria(club.id_club, {
        estado: config.estado_convocatoria,
        max_postulaciones: config.max_postulaciones,
        reiniciar_periodo: true,
      });
      setConfig(data);
      setExito('Contador reiniciado. Nuevo período de reclutamiento iniciado.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <Spinner />;

  const maxPost = config.max_postulaciones;
  const actuales = config.postulaciones_actuales;
  const porcentaje = maxPost ? Math.round((actuales / maxPost) * 100) : 0;
  const estaAbierta = config.estado_convocatoria === 'abierta';
  const cerradaPorLimite = config.estado_convocatoria === 'cerrada_por_limite';

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>Configuración de Convocatoria</h3>
        <p className={`text-sm mt-0.5 ${tema.subtitle}`}>Controla si tu club recibe nuevas postulaciones y establece un límite máximo.</p>
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}
      {exito && <Alerta tipo="success" mensaje={exito} />}

      <div className={`rounded-2xl border p-6 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className={`text-base font-bold ${tema.text}`}>Estado de la convocatoria</p>
            <p className={`text-sm ${tema.subtitle}`}>
              {estaAbierta
                ? 'Los estudiantes pueden enviar sus postulaciones'
                : cerradaPorLimite
                  ? 'Se alcanzó el límite de postulaciones. No se aceptan más.'
                  : 'No se aceptan nuevas postulaciones'}
            </p>
          </div>
          {!cerradaPorLimite && (
            <button
              onClick={toggleEstado}
              disabled={guardando}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                estaAbierta ? 'bg-emerald-500' : modoOscuro ? 'bg-slate-700' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-md ${
                  estaAbierta ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          )}
        </div>

        <BadgeEstado estado={config.estado_convocatoria} />

        {cerradaPorLimite && (
          <p className={`mt-3 text-xs ${tema.subtitle}`}>
            Para reabrir la convocatoria, cambia el límite o inicia un nuevo período.
          </p>
        )}
      </div>

      <div className={`rounded-2xl border p-6 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="mb-4">
          <label className={`text-base font-bold ${tema.text}`}>Límite de postulaciones</label>
          <p className={`text-sm ${tema.subtitle}`}>Número máximo de formularios que deseas recibir. Déjalo vacío para no tener límite.</p>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="number"
            min="0"
            placeholder="Sin límite"
            value={config.max_postulaciones ?? ''}
            onChange={(e) => setConfig((p) => ({ ...p, max_postulaciones: e.target.value ? parseInt(e.target.value, 10) : null }))}
            className={`w-32 rounded-xl border px-4 py-3 text-sm font-bold text-center transition-all ${
              modoOscuro
                ? 'bg-[#18223f] border-slate-700/50 text-white focus:border-amber-400/50'
                : 'bg-white border-slate-200 text-slate-900 focus:border-amber-400'
            } focus:outline-none`}
          />

          {maxPost !== null && (
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={tema.subtitle}>{actuales} recibidas</span>
                <span className={tema.subtitle}>{maxPost} máximo</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${modoOscuro ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    porcentaje >= 90 ? 'bg-red-500' : porcentaje >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(porcentaje, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => guardar()}
          disabled={guardando}
          className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-6 py-4 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {guardando ? (
            <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
          ) : (
            <>
              <Icono nombre="check" className="h-5 w-5" strokeWidth={2.5} />
              Guardar configuración
            </>
          )}
        </button>

        <button
          onClick={reiniciarPeriodo}
          disabled={guardando}
          className={`px-6 py-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed border ${
            modoOscuro
              ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
              : 'border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Reiniciar período
        </button>
      </div>
    </div>
  );
}
