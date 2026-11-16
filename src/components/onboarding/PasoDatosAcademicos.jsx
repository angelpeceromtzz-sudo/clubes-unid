/* Paso del onboarding: licenciatura y periodo académico actual. */
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { BotonAccion } from '../ui/BotonAccion';

export function PasoDatosAcademicos({
  licenciaturas = [],
  periodoActivo = null,
  periodoCargando = false,
  periodoError = '',
  onReintentarPeriodo,
  licenciatura,
  onCambiarLicenciatura,
}) {
  const { modoOscuro } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 id="titulo-paso" tabIndex={-1} className={`text-xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Tus datos académicos
        </h2>
        <p className={`mt-2 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          Esto nos ayuda a conocer tu contexto universitario.
        </p>
      </div>

      <div>
        <label className={`block text-sm font-semibold mb-2 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
          Licenciatura
        </label>
        <select
          value={licenciatura ?? ''}
          onChange={(e) => onCambiarLicenciatura(e.target.value ? Number(e.target.value) : null)}
          className={`w-full rounded-xl border px-3 py-2 text-sm ${
            modoOscuro ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          <option value="">Selecciona tu licenciatura</option>
          {licenciaturas.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={`block text-sm font-semibold mb-2 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>
          Periodo académico actual
        </label>
        {periodoCargando ? (
          <div className={`rounded-xl border px-3 py-2 text-sm ${modoOscuro ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-600'}`}>
            Cargando periodo...
          </div>
        ) : periodoError ? (
          <div className="space-y-2">
            <div className={`rounded-xl border px-3 py-2 text-sm ${modoOscuro ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {periodoError}
            </div>
            {onReintentarPeriodo && (
              <BotonAccion variant="outline" onClick={onReintentarPeriodo} className="w-full sm:w-auto">
                <Icono nombre="refresh-cw" className="h-4 w-4" />
                Reintentar
              </BotonAccion>
            )}
          </div>
        ) : periodoActivo ? (
          <div className={`rounded-xl border px-3 py-2 text-sm ${modoOscuro ? 'bg-slate-900/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-600'}`}>
            {periodoActivo.nombre}
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`rounded-xl border px-3 py-2 text-sm ${modoOscuro ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              No hay un periodo académico vigente configurado. Contacta a la administración.
            </div>
            {onReintentarPeriodo && (
              <BotonAccion variant="outline" onClick={onReintentarPeriodo} className="w-full sm:w-auto">
                <Icono nombre="refresh-cw" className="h-4 w-4" />
                Reintentar
              </BotonAccion>
            )}
          </div>
        )}
        <p className={`mt-1 text-xs ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          Se actualiza automáticamente según el periodo vigente.
        </p>
      </div>
    </div>
  );
}