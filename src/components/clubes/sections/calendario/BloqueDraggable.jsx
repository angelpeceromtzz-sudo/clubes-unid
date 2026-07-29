import { useDraggable } from '@dnd-kit/core';
import { Icono } from '../../../ui/Icono';
import { horaStr, timeToMinutes } from '../../../../utils/horario';

export function BloqueDraggable({ bloque, rowHeight, horaMin, puedeVer, onEditar, onEliminar, onDoubleClick, modoOscuro, onResizeStart }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `bloque-${bloque.id_horario}`,
    data: { bloque },
    disabled: !puedeVer,
  });

  const iniMin = timeToMinutes(horaStr(bloque.hora_inicio));
  const finMin = timeToMinutes(horaStr(bloque.hora_fin));
  const top = ((iniMin / 60) - horaMin) * rowHeight;
  const height = ((finMin - iniMin) / 60) * rowHeight;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onDoubleClick={() => puedeVer && onDoubleClick?.(bloque)}
      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 cursor-grab active:cursor-grabbing
        border-l-2 select-none transition-[opacity,box-shadow] duration-150
        ${isDragging ? 'opacity-30' : ''}
        ${modoOscuro
          ? 'bg-amber-400/10 border-amber-400/40 hover:bg-amber-400/20'
          : 'bg-amber-50 border-amber-400 hover:bg-amber-100'
        }`}
      style={{ top: `${top + 1}px`, height: `${height - 2}px`, zIndex: isDragging ? 0 : 1 }}
    >
      <p className={`text-[10px] font-bold leading-tight truncate
        ${modoOscuro ? 'text-amber-300' : 'text-amber-700'}`}>
        {horaStr(bloque.hora_inicio)}–{horaStr(bloque.hora_fin)}
      </p>
      <p className={`text-[9px] leading-tight truncate
        ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
        {bloque.lugar}
      </p>

      {puedeVer && !isDragging && (
        <div className="absolute top-0.5 right-0.5 flex gap-0.5 z-10 group-hover:hidden">
          <button onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditar?.(bloque); }}
            className={`p-1 rounded-md transition-colors cursor-pointer
              ${modoOscuro ? 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-white/80 text-slate-400 hover:text-slate-700 hover:bg-slate-200'}`}>
            <Icono nombre="edit" className="h-3 w-3" strokeWidth={2} />
          </button>
          <button onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEliminar?.(bloque.id_horario); }}
            className={`p-1 rounded-md transition-colors cursor-pointer
              ${modoOscuro ? 'bg-slate-800/80 text-red-400 hover:bg-red-500/15' : 'bg-white/80 text-red-400 hover:bg-red-50'}`}>
            <Icono nombre="trash" className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
      )}
      {puedeVer && !isDragging && (
        <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5 z-10">
          <button onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditar?.(bloque); }}
            className={`p-1 rounded-md transition-colors cursor-pointer
              ${modoOscuro ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'}`}>
            <Icono nombre="edit" className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEliminar?.(bloque.id_horario); }}
            className={`p-1 rounded-md transition-colors cursor-pointer
              ${modoOscuro ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
            <Icono nombre="trash" className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

      {puedeVer && !isDragging && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart?.(bloque, 'bottom', e);
          }}
          className={`absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize rounded-b-md flex items-end justify-center pb-0.5
            ${modoOscuro ? 'hover:bg-amber-400/30' : 'hover:bg-amber-200/60'}`}
        >
          <div className={`w-4 h-0.5 rounded-full ${modoOscuro ? 'bg-amber-400/40' : 'bg-amber-400/50'}`} />
        </div>
      )}
    </div>
  );
}
