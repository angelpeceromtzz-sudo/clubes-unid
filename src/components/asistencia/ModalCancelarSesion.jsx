/* Modal de cancelación de sesión con catálogo de motivos (PBI-05 §20–§22) — Mobile First. */
import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { BotonAccion } from '../ui/BotonAccion';
import { Alerta } from '../ui/Alerta';
import { Spinner } from '../ui/Spinner';
import { MOTIVOS_CANCELACION } from './constantesAsistencia';

export function ModalCancelarSesion({ show, sesion, onConfirmar, onCancelar, cargando, error }) {
  const { modoOscuro, tema } = useTheme();
  const [motivo, setMotivo] = useState('');
  const [observacion, setObservacion] = useState('');

  if (!show) return null;

  const esOtro = motivo === 'otro';
  const valido = motivo !== '' && (!esOtro || observacion.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div
        className={`rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6 border max-h-[90vh] overflow-y-auto ${
          modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className={`text-base font-black uppercase tracking-wider ${tema.title}`}>
            Cancelar sesión
          </h3>
          <button
            onClick={onCancelar}
            disabled={cargando}
            className={`p-1 -mr-1 cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
            aria-label="Cerrar"
          >
            <Icono nombre="close" className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <Alerta tipo="warning" className="mb-4">
          La cancelación indica que la actividad programada <strong>no se realizará</strong>.
          No sirve para justificar ausencias individuales.
        </Alerta>

        {sesion && (
          <p className={`text-xs mb-4 ${tema.subtitle}`}>
            Sesión del {sesion.fecha} ·{' '}
            {sesion.hora_inicio?.slice(0, 5)}–{sesion.hora_fin?.slice(0, 5)}
          </p>
        )}

        <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${tema.subtitle}`}>
          Motivo *
        </p>
        <div className="space-y-2 mb-4">
          {MOTIVOS_CANCELACION.map((m) => (
            <label
              key={m.codigo}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                motivo === m.codigo
                  ? 'border-amber-400/60 bg-amber-400/10'
                  : modoOscuro
                    ? 'border-slate-700 hover:border-slate-600'
                    : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="motivo-cancelacion"
                value={m.codigo}
                checked={motivo === m.codigo}
                onChange={() => setMotivo(m.codigo)}
                className="accent-amber-400"
              />
              <span className={`text-sm font-medium ${tema.text}`}>{m.label}</span>
            </label>
          ))}
        </div>

        {esOtro && (
          <div className="mb-4">
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${tema.subtitle}`}>
              Describe el motivo *
            </p>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              placeholder="Ej. La cancha está cerrada por mantenimiento…"
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none ${
                modoOscuro
                  ? 'bg-[#18223f] border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        )}

        {error && <Alerta tipo="error" mensaje={error} className="mb-4" />}

        <div className="flex gap-3">
          <BotonAccion variant="outline" className="flex-1" onClick={onCancelar} disabled={cargando}>
            Volver
          </BotonAccion>
          <BotonAccion
            variant="danger"
            className="flex-1"
            disabled={!valido || cargando}
            onClick={() => onConfirmar(motivo, esOtro ? observacion.trim() : null)}
          >
            {cargando ? <Spinner size="sm" className="!py-0" /> : 'Cancelar sesión'}
          </BotonAccion>
        </div>
      </div>
    </div>
  );
}
