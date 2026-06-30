export function Badge({ texto, color }) {
  const colores = {
    amber: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    emerald: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    red: 'bg-red-400/10 text-red-400 border-red-400/20',
    blue: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    slate: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
    purple: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colores[color] || colores.slate}`}>
      {texto}
    </span>
  );
}
