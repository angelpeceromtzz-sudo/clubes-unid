import { Icono } from '../ui/Icono';

export function InfoLugar({ lugar, c }) {
  if (!lugar) return null;
  return (
    <div className={`rounded-2xl border p-6 transition-colors duration-300 ${c.bg}`}>
      <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${c.title}`}>
        Lugar de Entrenamiento
      </h3>
      <div className="flex items-center gap-3">
        <Icono nombre="location" className="h-5 w-5 text-amber-400 shrink-0" />
        <Icono nombre="location-point" className="h-5 w-5 text-amber-400 shrink-0" />
        <p className={`text-sm font-medium ${c.text}`}>{lugar}</p>
      </div>
    </div>
  );
}
