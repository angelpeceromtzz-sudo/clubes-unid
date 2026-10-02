import { useState } from 'react';
import { Icono } from '../../../ui/Icono';
import { DIAS } from '../../../../constants/horario';
import { horaStr } from '../../../../utils/horario';

export function HorarioStackedView({ horarios, puedeVer, puedeVerNotas, mostrarTodos, modoOscuro, onToggleMostrar, onEditar, onEliminar }) {
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);

  const diasConHorarios = [1, 2, 3, 4, 5, 6, 0].filter(dia => horarios.some(h => h.dia_semana === dia));
  const diasVisibles = puedeVer || mostrarTodos ? diasConHorarios : diasConHorarios.slice(0, 1);
  const hayMas = !puedeVer && diasConHorarios.length > 1 && !mostrarTodos;

  return (
    <div className="space-y-3 p-4">
      {diasVisibles.map(dia => {
        const bloques = horarios.filter(h => h.dia_semana === dia);
        return (
          <div key={dia}
            className={`rounded-xl border overflow-hidden
              ${modoOscuro ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
            <div className={`px-4 py-2.5 border-b font-bold text-xs md:text-sm uppercase tracking-wider
              ${modoOscuro ? 'border-slate-700/50 text-amber-400' : 'border-slate-200 text-amber-600'}`}>
              {DIAS[dia]}
            </div>
            {bloques.map(b => {
              const seleccionado = bloqueSeleccionado === b.id_horario;
              return (
                <div key={b.id_horario}
                  onClick={() => puedeVer ? setBloqueSeleccionado(seleccionado ? null : b.id_horario) : null}
                  className={`px-4 py-3 border-b last:border-b-0 transition-colors
                    ${puedeVer ? 'cursor-pointer' : ''}
                    ${seleccionado ? modoOscuro ? 'bg-amber-400/10' : 'bg-amber-50' : ''}
                    ${modoOscuro ? 'border-slate-700/30' : 'border-slate-200/60'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Icono nombre="clock" className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={2} />
                        <span className={`text-sm md:text-base font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                          {horaStr(b.hora_inicio)} – {horaStr(b.hora_fin)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Icono nombre="location" className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400/60" strokeWidth={2} />
                        <span className={`text-xs md:text-sm break-words ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{b.lugar}</span>
                      </div>
                    </div>
                    {(b.descripcion || b.ubicacion_maps) && (
                      <div className="min-w-0 sm:text-right sm:shrink-0">
                        {puedeVerNotas && b.descripcion && (
                          <p className={`text-xs md:text-sm leading-snug line-clamp-3 sm:line-clamp-2 break-words ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                            {b.descripcion}
                          </p>
                        )}
                        {b.ubicacion_maps && (
                          <a href={b.ubicacion_maps} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className={`inline-flex items-center gap-1 text-xs md:text-sm font-bold mt-0.5 transition-colors
                              ${modoOscuro ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}>
                            <Icono nombre="location" className="h-3 w-3" strokeWidth={2} />
                            Ver ubicación
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  {puedeVer && seleccionado && (
                    <div className={`flex gap-2 mt-2 pt-2 border-t
                      ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                      <button onClick={(e) => { e.stopPropagation(); onEditar(b); }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border
                          ${modoOscuro ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'}`}>
                        Editar
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onEliminar(b.id_horario); }}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15">
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {hayMas && (
        <button onClick={onToggleMostrar}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border
            ${modoOscuro
              ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}>
          Ver horario ({diasConHorarios.length - 1} {diasConHorarios.length - 1 === 1 ? 'día restante' : 'días restantes'})
        </button>
      )}
      {mostrarTodos && !puedeVer && diasConHorarios.length > 1 && (
        <button onClick={onToggleMostrar}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border
            ${modoOscuro
              ? 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300'}`}>
          Mostrar menos
        </button>
      )}
    </div>
  );
}
