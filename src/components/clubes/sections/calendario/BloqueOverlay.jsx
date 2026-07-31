import { horaStr, timeToMinutes } from '../../../../utils/horario';

export function BloqueOverlay({ bloque, rowHeight, modoOscuro }) {
  const iniMin = timeToMinutes(horaStr(bloque.hora_inicio));
  const finMin = timeToMinutes(horaStr(bloque.hora_fin));
  const height = ((finMin - iniMin) / 60) * rowHeight;

  return (
    <div
      className={`rounded-md px-1.5 border-l-2 pointer-events-none
        shadow-xl ring-2 ring-amber-400/30
        ${modoOscuro
          ? 'bg-amber-400/20 border-amber-400/60'
          : 'bg-amber-100 border-amber-500'
        }`}
      style={{ height: `${Math.max(height - 2, 20)}px`, width: '100%' }}
    >
      <p className={`text-[10px] font-bold leading-tight truncate
        ${modoOscuro ? 'text-amber-300' : 'text-amber-700'}`}>
        {horaStr(bloque.hora_inicio)}–{horaStr(bloque.hora_fin)}
      </p>
      <p className={`text-[9px] leading-tight truncate
        ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
        {bloque.lugar}
      </p>
    </div>
  );
}
