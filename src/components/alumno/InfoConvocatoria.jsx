export function InfoConvocatoria({ convocatoria, tema }) {
  if (!convocatoria) return null;
  return (
    <div className={`rounded-xl p-3 mb-3 ${tema.isDark ? 'bg-[#18223f]' : 'bg-slate-100'}`}>
      <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${tema.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Evaluación programada
      </p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>
            {new Date(convocatoria.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>⏰</span>
          <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>{convocatoria.hora}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span className={tema.isDark ? 'text-slate-300' : 'text-slate-700'}>{convocatoria.lugar}</span>
        </div>
      </div>
    </div>
  );
}
