import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spinner } from '../../ui/Spinner';
import { Alerta } from '../../ui/Alerta';
import { BadgeEstado } from '../convocatoria/BadgeEstado';
import { ConvocatoriaGuardarButton, ConvocatoriaCerrarButton, ConvocatoriaConfirmCerrarBox, ConvocatoriaConfirmSaveBox } from '../convocatoria/ConvocatoriaAcciones';
import { MAX_POSTULACIONES } from '../../../constants/limites';
import { toDatetimeLocal, fromDatetimeLocal } from '../../../utils/fechas';
import { validarFormularioConvocatoria, construirResumenCambios } from '../../../utils/convocatoria';

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
    const { errores, valido } = validarFormularioConvocatoria(apertura, cierre, maxPost, ahora);
    setErrores(errores);
    return valido;
  }

  function handleChangeApertura(e) {
    const nuevaApertura = fromDatetimeLocal(e.target.value);
    setConfig(p => ({ ...p, fecha_apertura_programada: nuevaApertura }));
    setErrores(prev => ({ ...prev, fecha_apertura: '' }));
  }

  function handleChangeCierre(e) {
    const nuevaCierre = fromDatetimeLocal(e.target.value);
    setConfig(p => ({ ...p, fecha_limite_cierre: nuevaCierre }));
    setErrores(prev => ({ ...prev, fecha_cierre: '' }));
  }

  function handleChangeMaxPost(e) {
    const valor = e.target.value;
    const nuevoMax = valor ? parseInt(valor, 10) : null;
    setConfig(p => ({ ...p, max_postulaciones: nuevoMax }));
    if (nuevoMax === null) {
      setErrores(prev => ({ ...prev, max_postulaciones: '' }));
    }
  }

  function resumenCambios() {
    return construirResumenCambios(config);
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
  const estiloInput = `w-full rounded-xl border px-4 py-3 text-sm transition-all ${
    modoOscuro
      ? 'bg-[#18223f] border-slate-700/50 text-white focus:border-amber-400/50'
      : 'bg-white border-slate-200 text-slate-900 focus:border-amber-400'
  } focus:outline-none`;
  const estiloCard = `rounded-2xl border p-6 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-xl font-black uppercase tracking-wider ${tema.title}`}>Configuración de Convocatoria</h3>
        <p className={`text-sm mt-0.5 ${tema.subtitle}`}>Programa las fechas de apertura y cierre, y establece un límite máximo de postulaciones.</p>
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}
      {exito && <Alerta tipo="success" mensaje={exito} />}

      <div className={estiloCard}>
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

      <div className={estiloCard}>
        <div className="mb-4">
          <label className={`text-base font-bold ${tema.text}`}>Fecha de apertura programada</label>
          <p className={`text-sm ${tema.subtitle}`}>Cuándo empezará a recibir postulaciones. Si la convocatoria estaba cerrada manualmente, al guardar una nueva fecha se reabrirá.</p>
        </div>
        <input
          type="datetime-local"
          value={toDatetimeLocal(config.fecha_apertura_programada)}
          onChange={handleChangeApertura}
          onBlur={() => validarFormulario(config.fecha_apertura_programada, config.fecha_limite_cierre, config.max_postulaciones)}
          disabled={guardando}
          className={`${estiloInput} ${errores.fecha_apertura ? 'border-red-500' : ''}`}
        />
        {errores.fecha_apertura && (
          <p className="mt-2 text-xs text-red-400 font-medium">{errores.fecha_apertura}</p>
        )}
      </div>

      <div className={estiloCard}>
        <div className="mb-4">
          <label className={`text-base font-bold ${tema.text}`}>Fecha límite de cierre</label>
          <p className={`text-sm ${tema.subtitle}`}>Cuándo dejará de recibir postulaciones. Déjalo vacío para no tener límite.</p>
        </div>
        <input
          type="datetime-local"
          value={toDatetimeLocal(config.fecha_limite_cierre)}
          onChange={handleChangeCierre}
          onBlur={() => validarFormulario(config.fecha_apertura_programada, config.fecha_limite_cierre, config.max_postulaciones)}
          disabled={guardando}
          className={`${estiloInput} ${errores.fecha_cierre ? 'border-red-500' : ''}`}
        />
        {errores.fecha_cierre && (
          <p className="mt-2 text-xs text-red-400 font-medium">{errores.fecha_cierre}</p>
        )}
      </div>

      <div className={estiloCard}>
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
            onBlur={() => validarFormulario(config.fecha_apertura_programada, config.fecha_limite_cierre, config.max_postulaciones)}
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
        <ConvocatoriaConfirmCerrarBox
          guardando={guardando}
          onConfirmar={cerrarConvocatoria}
          onCancelar={() => setConfirmacionCerrar(false)}
          modoOscuro={modoOscuro}
          tema={tema}
        />
      )}

      <div className="flex gap-3">
        {confirmacionPendiente ? (
          <ConvocatoriaConfirmSaveBox
            resumenCambios={resumenCambios()}
            guardando={guardando}
            errores={errores}
            onConfirmar={() => { setConfirmacionPendiente(false); guardar(); }}
            onCancelar={() => setConfirmacionPendiente(false)}
            tema={tema}
          />
        ) : (
          <>
            <ConvocatoriaGuardarButton
              guardando={guardando}
              errores={errores}
              onClick={() => setConfirmacionPendiente(true)}
            />
            <ConvocatoriaCerrarButton
              guardando={guardando}
              estado={estado}
              modoOscuro={modoOscuro}
              onClick={() => setConfirmacionCerrar(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}
