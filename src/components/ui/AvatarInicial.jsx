const TAMANOS = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const COLORES = {
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function AvatarInicial({ nombre, color = 'amber', size = 'sm' }) {
  const inicial = (nombre || '?').charAt(0).toUpperCase();
  return (
    <div className={`rounded-full flex items-center justify-center font-bold shrink-0 border ${TAMANOS[size]} ${COLORES[color] || COLORES.amber}`}>
      {inicial}
    </div>
  );
}
