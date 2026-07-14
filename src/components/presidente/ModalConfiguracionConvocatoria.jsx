import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Alerta } from '../ui/Alerta';
import { Icono } from '../ui/Icono';

const MAX_POSTULACIONES = 40;

function BadgeEstado({ estado }) {
  if (estado === 'abierto') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
        <Icono nombre="check-circle" strokeWidth={2} className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Abierta</span>
      </div>
    );
  }
  if (estado === 'proximo') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-400">
        <Icono nombre="clock" strokeWidth={2} className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Abre pronto</span>
      </div>
    );
  }
  if (estado === 'lleno') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400">
        <Icono nombre="alert-triangle" strokeWidth={2} className="h-4 w-4" />
        <span className="text-sm font-bold uppercase tracking-wider">Cupo lleno</span>
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

function formatearFechaLegible(fechaIso) {
  if (!fechaIso) return '';
  const fecha = new Date(fechaIso);
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function toDatetimeLocal(fechaIso) {
  if (!fechaIso) return '';
  const d = new Date(fechaIso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function ModalConfiguracionConvocatoria({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [config, setConfig] = useState({
    fecha_apertura_programada: null,
    fecha_limite_cierre: null,
    max_postulaciones: null,
    postulaciones_actuales: 0,
    estado_calculado: 'cerrado',
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [confirmacionPendiente, setConfirmacionPendiente] = useState(false);
  const [confirmacionCerrar, setConfirmacionCerrar] = useState(false);
  const [errores, setErrores] = useState({ fecha_apertura: '', fecha_cierre: '', max_postulaciones: '' });

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

  const ahora = new Date();

  function validarFormulario(apertura, cierre, maxPost) {
    const nuevosErrores = { fecha_apertura: '', fecha_cierre: '', max_postulaciones: '' };
    let valido = true;

    if (apertura) {
      if (new Date(apertura) < ahora) {
        nuevosErrores.fecha_apertura = 'La fecha de apertura no puede ser anterior a la fecha y hora actual.';
        valido = false;
      }
    }

    if (cierre) {
      if (new Date(cierre) < ahora) {
        nuevosErrores.fecha_cierre = 'La fecha de cierre no puede ser anterior a la fecha y hora actual.';
        valido = false;
      }
    }

    if (apertura && cierre && new Date(cierre) <= new Date(apertura)) {
      nuevosErrores.fecha_cierre = 'La fecha de cierre debe ser posterior a la fecha de apertura.';
      valido = false;
    }

    if (maxPost !== null) {
      if (!Number.isInteger(maxPost) || maxPost < 1) {
        nuevosErrores.max_postulaciones = 'Debe ser un número entero entre 1 y 40.';
        valido = false;
      } else if (maxPost > MAX_POSTULACIONES) {
        nuevosErrores.max_postulaciones = `El límite máximo permitido es ${MAX_POSTULACIONES}.`;
        valido = false;
      }
    }

    setErrores(nuevosErrores);
    return valido;
  }

  function handleChangeApertura(e) {
    const valor = e.target.value;
    const nuevaApertura = fromDatetimeLocal(valor);
    setConfig((p) => {
      const actualizado = { ...p, fecha_apertura_programada: nuevaApertura };
      return actualizado;
    });
    setErrores((prev) => ({ ...prev, fecha_apertura: '' }));
  }

  function handleChangeCierre(e) {
    const valor = e.target.value;
    const nuevaCierre = fromDatetimeLocal(valor);
    setConfig((p) => {
      const actualizado = { ...p, fecha_limite_cierre: nuevaCierre };
      return actualizado;
    });
    setErrores((prev) => ({ ...prev, fecha_cierre: '' }));
  }

  function handleChangeMaxPost(e) {
    const valor = e.target.value;
    const nuevoMax = valor ? parseInt(valor, 10) : null;
    setConfig((p) => ({ ...p, max_postulaciones: nuevoMax }));
    if (nuevoMax === null) {
      setErrores((prev) => ({ ...prev, max_postulaciones: '' }));
    }
  }

  function construirResumenCambios() {
    const partes = [];
    if (config.fecha_apertura_programada && config.fecha_limite_cierre) {
      partes.push(`La convocatoria abrirá el ${formatearFechaLegible(config.fecha_apertura_programada)} y cerrará el ${formatearFechaLegible(config.fecha_limite_cierre)}.`);
    } else if (config.fecha_apertura_programada) {
      partes.push(`La convocatoria abrirá el ${formatearFechaLegible(config.fecha_apertura_programada)} y no tendrá fecha límite de cierre.`);
    } else if (config.fecha_limite_cierre) {
      partes.push(`La convocatoria está abierta y cerrará el ${formatearFechaLegible(config.fecha_limite_cierre)}.`);
    } else {
      partes.push('La convocatoria no tiene fechas programadas.');
    }
    partes.push(`Límite de ${config.max_postulaciones ?? MAX_POSTULACIONES} postulaciones.`);
    return partes.join(' ');
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    setExito('');

    const maxPostFinal = config.max_postulaciones ?? MAX_POSTULACIONES;

    try {
      const data = await api.actualizarConfiguracionConvocatoria(club.id_club, {
        fecha_apertura_programada: config.fecha_apertura_programada,
        fecha_limite_cierre: config.fecha_limite_cierre,
        max_postulaciones: maxPostFinal,
      });
      setConfig(data);
      setExito('Configuración guardada correctamente');
      setConfirmacionPendiente(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarConvocatoria() {
    setGuardando(true);
    setError('');
    setExito('');
    try {
      const data = await api.cerrarConvocatoria(club.id_club);
      setConfig(data);
      setExito('Convocatoria cerrada correctamente.');
      setConfirmacionCerrar(false);
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
  const estado = config.estado_calculado;

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>Configuración de Convocatoria</h3>
        <p className={`text-sm mt-0.5 ${tema.subtitle}`}>Programa las fechas de apertura y cierre, y establece un límite máximo de postulaciones.</p>
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}
      {exito && <Alerta tipo="success" mensaje={exito} />}

      <div className={`rounded-2xl border p-6 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="mb-4">
          <p className={`text-base font-bold ${tema.text}`}>Estado actual de la convocatoria</p>
          <p className={`text-sm ${tema.subtitle}`}>
            {estado === 'abierto'
              ? 'Los estudiantes pueden enviar sus postulaciones'
              : estado === 'proximo'
                ? 'La convocatoria aún no ha abierto'
                : estado === 'lleno'
                  ? 'Se alcanzó el límite de postulaciones'
                  : 'No se aceptan nuevas postulaciones'}
          </p>
        </div>
        <BadgeEstado estado={estado} />
      </div>

      <div className={`rounded-2xl border p-6 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="mb-4">
          <label className={`text-base font-bold ${tema.text}`}>Fecha de apertura programada</label>
          <p className={`text-sm ${tema.subtitle}`}>Cuándo empezará a recibir postulaciones. Si la convocatoria estaba cerrada manualmente, al guardar una nueva fecha se reabrirá.</p>
        </div>
        <input
          type="datetime-local"
          value={toDatetimeLocal(config.fecha_apertura_programada)}
          onChange={handleChangeApertura}
          onBlur={() => validarFormulario(
            config.fecha_apertura_programada,
            config.fecha_limite_cierre,
            config.max_postulaciones,
          )}
          disabled={guardando}
          className={`w-full rounded-xl border px-4 py-3 text-sm transition-all ${
            modoOscuro
              ? 'bg-[#18223f] border-slate-700/50 text-white focus:border-amber-400/50'
              : 'bg-white border-slate-200 text-slate-900 focus:border-amber-400'
          } focus:outline-none ${errores.fecha_apertura ? 'border-red-500' : ''}`}
        />
        {errores.fecha_apertura && (
          <p className="mt-2 text-xs text-red-400 font-medium">{errores.fecha_apertura}</p>
        )}
      </div>

      <div className={`rounded-2xl border p-6 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="mb-4">
          <label className={`text-base font-bold ${tema.text}`}>Fecha límite de cierre</label>
          <p className={`text-sm ${tema.subtitle}`}>Cuándo dejará de recibir postulaciones. Déjalo vacío para no tener límite.</p>
        </div>
        <input
          type="datetime-local"
          value={toDatetimeLocal(config.fecha_limite_cierre)}
          onChange={handleChangeCierre}
          onBlur={() => validarFormulario(
            config.fecha_apertura_programada,
            config.fecha_limite_cierre,
            config.max_postulaciones,
          )}
          disabled={guardando}
          className={`w-full rounded-xl border px-4 py-3 text-sm transition-all ${
            modoOscuro
              ? 'bg-[#18223f] border-slate-700/50 text-white focus:border-amber-400/50'
              : 'bg-white border-slate-200 text-slate-900 focus:border-amber-400'
          } focus:outline-none ${errores.fecha_cierre ? 'border-red-500' : ''}`}
        />
        {errores.fecha_cierre && (
          <p className="mt-2 text-xs text-red-400 font-medium">{errores.fecha_cierre}</p>
        )}
      </div>

      <div className={`rounded-2xl border p-6 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="mb-4">
          <label className={`text-base font-bold ${tema.text}`}>Límite de postulaciones</label>
          <p className={`text-sm ${tema.subtitle}`}>Número máximo de formularios que deseas recibir (máx. {MAX_POSTULACIONES}). Déjalo vacío y se usará {MAX_POSTULACIONES} por defecto.</p>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="number"
            min="1"
            max={MAX_POSTULACIONES}
            placeholder={`${MAX_POSTULACIONES}`}
            value={config.max_postulaciones ?? ''}
            onChange={handleChangeMaxPost}
            onBlur={() => validarFormulario(
              config.fecha_apertura_programada,
              config.fecha_limite_cierre,
              config.max_postulaciones,
            )}
            className={`w-32 rounded-xl border px-4 py-3 text-sm font-bold text-center transition-all ${
              modoOscuro
                ? 'bg-[#18223f] border-slate-700/50 text-white focus:border-amber-400/50'
                : 'bg-white border-slate-200 text-slate-900 focus:border-amber-400'
            } focus:outline-none ${errores.max_postulaciones ? 'border-red-500' : ''}`}
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
        {config.max_postulaciones === null && !errores.max_postulaciones && (
          <p className="mt-2 text-xs text-slate-500 font-medium">Se usará el máximo de {MAX_POSTULACIONES} si lo dejas vacío.</p>
        )}
        {errores.max_postulaciones && (
          <p className="mt-2 text-xs text-red-400 font-medium">{errores.max_postulaciones}</p>
        )}
      </div>

      {confirmacionCerrar && (
        <div className={`rounded-2xl border p-4 ${modoOscuro ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-medium mb-3 ${tema.text}`}>
            ¿Cerrar la convocatoria ahora? Ya no se recibirán nuevas postulaciones. Los formularios que ya se recibieron no se verán afectados.
          </p>
          <div className="flex gap-3">
            <button
              onClick={cerrarConvocatoria}
              disabled={guardando}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl px-4 py-3 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {guardando ? (
                <Spinner size="sm" color="border-white" className="!py-0" />
              ) : (
                <>
                  <Icono nombre="close" className="h-4 w-4" strokeWidth={2.5} />
                  Sí, cerrar
                </>
              )}
            </button>
            <button
              onClick={() => setConfirmacionCerrar(false)}
              disabled={guardando}
              className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                modoOscuro
                  ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {confirmacionPendiente ? (
          <div className={`w-full rounded-2xl border p-4 ${modoOscuro ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-sm font-medium mb-3 ${tema.text}`}>
              {construirResumenCambios()}
            </p>
            <p className={`text-xs font-medium mb-3 ${tema.subtitle}`}>¿Confirmar cambios?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmacionPendiente(false); guardar(); }}
                disabled={guardando || Object.values(errores).some(Boolean)}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-4 py-3 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                ) : (
                  <>
                    <Icono nombre="check" className="h-4 w-4" strokeWidth={2.5} />
                    Confirmar
                  </>
                )}
              </button>
              <button
                onClick={() => setConfirmacionPendiente(false)}
                disabled={guardando}
                className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  modoOscuro
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirmacionPendiente(true)}
              disabled={guardando || Object.values(errores).some(Boolean)}
              className="flex-1 bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl px-6 py-4 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icono nombre="check" className="h-5 w-5" strokeWidth={2.5} />
              Guardar configuración
            </button>

            {estado === 'abierto' && (
              <button
                onClick={() => setConfirmacionCerrar(true)}
                disabled={guardando}
                className={`px-6 py-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed border ${
                  modoOscuro
                    ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                    : 'border-red-300 text-red-600 hover:bg-red-50'
                }`}
              >
                Cerrar convocatoria ahora
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
