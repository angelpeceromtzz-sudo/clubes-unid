export function InfoHorarios({ horarios, c }) {
  if (!horarios) return null;
  return (
    <div className={`rounded-2xl border p-6 transition-colors duration-300 ${c.bg}`}>
      <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${c.title}`}>
        Horarios y Días Detallados
      </h3>
      <div className="space-y-3">
        {horarios.map((h, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className={`text-sm font-medium ${c.text}`}>
              <strong className={c.title}>{h.dia}:</strong> {h.horario}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
