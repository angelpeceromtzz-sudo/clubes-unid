/* Alerta contextual con variantes de color (error, success, warning, info).
   Muestra un icono y mensaje; soporta children para contenido adicional. */
import { Icono } from './Icono';

const CONFIG = {
  error: {
    bg: 'bg-red-500/10 border-red-500/30',
    text: 'text-red-400',
    icono: 'alert-circle',
    iconColor: 'text-red-400',
  },
  success: {
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
    icono: 'check-circle',
    iconColor: 'text-emerald-400',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    text: 'text-amber-400',
    icono: 'alert-triangle',
    iconColor: 'text-amber-400',
  },
  info: {
    bg: 'bg-blue-500/10 border-blue-500/30',
    text: 'text-blue-400',
    icono: 'info',
    iconColor: 'text-blue-400',
  },
};

export function Alerta({ tipo = 'error', mensaje, children, className = '' }) {
  if (!mensaje && !children) return null;
  const c = CONFIG[tipo] || CONFIG.error;
  return (
    <div className={`rounded-xl p-4 border ${c.bg} ${className}`}>
      <div className="flex items-start gap-2">
        <Icono nombre={c.icono} strokeWidth={2} className={`h-4 w-4 mt-0.5 shrink-0 ${c.iconColor}`} />
        <div>
          {mensaje && <p className={`text-sm font-medium ${c.text}`}>{mensaje}</p>}
          {children && <div className={`text-sm ${c.text}`}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
