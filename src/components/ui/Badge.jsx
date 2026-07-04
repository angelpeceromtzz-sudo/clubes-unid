/* Etiqueta tipo badge con colores predefinidos (amber, emerald, red, blue, etc.) y tamaños sm/md. */
const COLORES = {
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const TAMANOS = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({ texto, color = 'slate', size = 'sm' }) {
  return (
    <span className={`uppercase font-bold rounded-full border ${TAMANOS[size]} ${COLORES[color] || COLORES.slate}`}>
      {texto}
    </span>
  );
}
