import { ETIQUETAS } from '../../../constants/inscripcion';
import { Alerta } from '../../ui/Alerta';

export function PasoConfirmacionInscripcion({ formulario, errorApi, confirmado, setConfirmado, enviando, manejarEnvio, onEditar, modoOscuro, tema }) {
  const resumenCls = `rounded-xl border p-4 ${modoOscuro ? 'bg-slate-800/30 border-slate-700/30' : 'bg-slate-50 border-slate-200'}`;
  const resumenLabelCls = 'text-[11px] font-bold uppercase tracking-wider text-slate-400';
  const resumenValCls = `text-sm font-medium mt-0.5 ${modoOscuro ? 'text-white' : 'text-slate-900'}`;

  return (
    <div>
      <div className="mb-5">
        <p className={`text-base font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
          Revisa tus datos antes de confirmar
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {Object.entries(ETIQUETAS).map(([campo, etiqueta]) => {
          const valor = formulario[campo];
          const omitir = campo === 'experiencia_previa' && !valor;
          if (omitir) return null;
          return (
            <div key={campo} className={resumenCls}>
              <p className={resumenLabelCls}>{etiqueta}</p>
              <p className={resumenValCls}>
                {campo === 'cuatrimestre' ? `${valor}°` : valor || <span className="italic text-slate-400">No especificado</span>}
              </p>
            </div>
          );
        })}
      </div>

      <Alerta tipo="error" mensaje={errorApi} />

      <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${confirmado ? (modoOscuro ? 'border-amber-400/40 bg-amber-400/5' : 'border-amber-400/40 bg-amber-50') : (modoOscuro ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50')}`}>
        <input
          type="checkbox"
          checked={confirmado}
          onChange={(e) => setConfirmado(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400 cursor-pointer"
        />
        <span className={`text-xs leading-relaxed ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
          Confirmo que la información proporcionada es correcta y entiendo que el envío de esta postulación no garantiza mi aceptación en el club. También comprendo que proporcionar información falsa o incumplir los requisitos de la convocatoria puede ser motivo de rechazo.
        </span>
      </label>

      <div className="flex gap-3 mt-2">
        <button
          onClick={manejarEnvio}
          disabled={enviando || !confirmado}
          className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-sm uppercase tracking-widest rounded-xl py-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
        >
          {enviando ? 'Enviando...' : 'Sí, Confirmar y Enviar'}
        </button>
        <button
          onClick={onEditar}
          disabled={enviando}
          className={`px-6 py-3.5 rounded-xl border text-sm font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${modoOscuro ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
        >
          Editar
        </button>
      </div>
    </div>
  );
}
