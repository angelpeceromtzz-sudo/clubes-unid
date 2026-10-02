import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { DIAS_SEMANA, DIAS_SEMANA_LABEL, SNAP_MINUTES } from '../../../constants/horario';
import { horaStr, timeToMinutes, minutesToTime, snapMinutesNearest, yToMinutes, hayConflicto } from '../../../utils/horario';
import { BloqueDraggable } from './calendario/BloqueDraggable';
import { BloqueOverlay } from './calendario/BloqueOverlay';
import { ColumnaDia } from './calendario/ColumnaDia';
export function CalendarioGrid({
  horarios,
  rowHeight = 40,
  colHoraWidth = 36,
  horaMin,
  horaMax,
  puedeVer,
  modoOscuro,
  drawMode = false,
  onEditar,
  onEliminar,
  onMove,
  onResize,
  onCreate,
}) {
  const gridRef = useRef(null);
  const [activeBloque, setActiveBloque] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [, setIsResizing] = useState(false);
  const [resizeData, setResizeData] = useState(null);
  const [pointerPos, setPointerPos] = useState(null);

  const horas = useMemo(() => {
    const arr = [];
    for (let h = horaMin; h <= horaMax; h++) arr.push(h);
    return arr;
  }, [horaMin, horaMax]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  /* ─── Drag handlers ─── */
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const bloque = active.data?.current?.bloque;
    if (bloque) {
      setActiveBloque(bloque);
      const e = event.activatorEvent;
      if (e) setPointerPos({ x: e.clientX, y: e.clientY });
    }
  }, []);

  useEffect(() => {
    if (!activeBloque) return;
    const onMove = (e) => setPointerPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [activeBloque]);

  const dragPreview = useMemo(() => {
    // eslint-disable-next-line react-hooks/refs
    if (!activeBloque || !pointerPos || !gridRef.current) return null;
    // eslint-disable-next-line react-hooks/refs
    const gridRect = gridRef.current.getBoundingClientRect();
    const pointerX = pointerPos.x - gridRect.left;
    const pointerY = pointerPos.y - gridRect.top;

    if (pointerX < colHoraWidth) return null;

    const gridHeight = horas.length * rowHeight;
    if (pointerY < 0 || pointerY > gridHeight) return null;

    const colWidth = (gridRect.width - colHoraWidth) / 7;
    const colIndex = Math.max(0, Math.min(6, Math.floor((pointerX - colHoraWidth) / colWidth)));
    const diaIndex = colIndex;
    const dia = DIAS_SEMANA[diaIndex];

    const duracion = timeToMinutes(horaStr(activeBloque.hora_fin)) - timeToMinutes(horaStr(activeBloque.hora_inicio));
    const inicio = yToMinutes(pointerY, rowHeight, horaMin);
    const fin = inicio + duracion;

    if (fin > horaMax * 60 + 60) return null;
    if (inicio < horaMin * 60) return null;

    const top = ((inicio / 60) - horaMin) * rowHeight;
    const height = (duracion / 60) * rowHeight;

    return { diaIndex, dia, inicio, fin, top, height };
  }, [activeBloque, pointerPos, colHoraWidth, rowHeight, horaMin, horaMax, horas.length]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    const lastPointer = pointerPos;
    setActiveBloque(null);
    setPointerPos(null);

    if (!over || !gridRef.current) return;

    const bloque = active.data?.current?.bloque;
    if (!bloque) return;

    if (!lastPointer) return;

    const gridRect = gridRef.current.getBoundingClientRect();
    if (lastPointer.y < gridRect.top || lastPointer.y > gridRect.bottom ||
        lastPointer.x < gridRect.left || lastPointer.x > gridRect.right) return;

    if (!dragPreview) return;

    const nuevoDia = dragPreview.dia;
    const nuevoInicio = dragPreview.inicio;
    const nuevoFin = dragPreview.fin;

    if (nuevoDia === bloque.dia_semana &&
        nuevoInicio === timeToMinutes(horaStr(bloque.hora_inicio))) return;

    if (hayConflicto(nuevoDia, nuevoInicio, nuevoFin, bloque.id_horario, horarios)) {
      onMove?.(bloque.id_horario, {
        dia_semana: nuevoDia,
        hora_inicio: minutesToTime(nuevoInicio),
        hora_fin: minutesToTime(nuevoFin),
        conflicto: true,
      });
      return;
    }

    onMove?.(bloque.id_horario, {
      dia_semana: nuevoDia,
      hora_inicio: minutesToTime(nuevoInicio),
      hora_fin: minutesToTime(nuevoFin),
    });
  }, [dragPreview, horarios, onMove, pointerPos]);

  /* ─── Resize handlers ─── */
  const handleResizeStart = useCallback((bloque, edge, e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeData({ bloque, edge, startY: e.clientY, startFin: timeToMinutes(horaStr(bloque.hora_fin)), startIni: timeToMinutes(horaStr(bloque.hora_inicio)) });

    const handleMove = (moveE) => {
      setResizeData(prev => {
        if (!prev) return prev;
        const deltaY = moveE.clientY - prev.startY;
        const deltaMinutes = snapMinutesNearest((deltaY / rowHeight) * 60);
        const newFin = Math.max(prev.startIni + SNAP_MINUTES, Math.min(23 * 60 + 30, prev.startFin + deltaMinutes));
        return { ...prev, newFin };
      });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      setResizeData(prev => {
        if (prev && prev.newFin) {
          const nuevaFin = minutesToTime(prev.newFin);
          if (nuevaFin !== horaStr(prev.bloque.hora_fin)) {
            onResize?.(prev.bloque.id_horario, {
              hora_inicio: horaStr(prev.bloque.hora_inicio),
              hora_fin: nuevaFin,
            });
          }
        }
        return null;
      });
      setIsResizing(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [rowHeight, onResize]);

  /* ─── Draw-to-create handlers ─── */
  const handleGridPointerDown = useCallback((e) => {
    if (!puedeVer || !drawMode) return;
    if (e.target.closest('[data-bloque]')) return;
    if (e.target.closest('button')) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const pointerX = e.clientX - gridRect.left;
    const pointerY = e.clientY - gridRect.top;

    if (pointerX < colHoraWidth) return;

    const colWidth = (gridRect.width - colHoraWidth) / 7;
    const colIndex = Math.floor((pointerX - colHoraWidth) / colWidth);
    const diaIndex = Math.max(0, Math.min(6, colIndex));
    const dia = DIAS_SEMANA[diaIndex];

    const minuto = yToMinutes(pointerY, rowHeight, horaMin);

    setIsDrawing(true);
    setDrawStart({ dia, minuto });
    setDrawEnd({ dia, minuto: minuto + SNAP_MINUTES });
  }, [puedeVer, drawMode, colHoraWidth, rowHeight, horaMin]);

  const handleGridPointerMove = useCallback((e) => {
    if (!isDrawing || !drawStart) return;

    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    const pointerY = e.clientY - gridRect.top;
    const minuto = yToMinutes(pointerY, rowHeight, horaMin);

    setDrawEnd({ dia: drawStart.dia, minuto: Math.max(minuto, drawStart.minuto + SNAP_MINUTES) });
  }, [isDrawing, drawStart, rowHeight, horaMin]);

  const handleGridPointerUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawEnd) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawEnd(null);
      return;
    }

    const inicio = Math.min(drawStart.minuto, drawEnd.minuto);
    const fin = Math.max(drawStart.minuto, drawEnd.minuto);

    if (fin - inicio >= SNAP_MINUTES) {
      onCreate?.({
        dia_semana: drawStart.dia,
        hora_inicio: minutesToTime(inicio),
        hora_fin: minutesToTime(fin),
      });
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
  }, [isDrawing, drawStart, drawEnd, onCreate]);

  /* ─── Bloques por día ─── */
  function getBloquesPorDia(dia) {
    return horarios
      .filter(h => h.dia_semana === dia)
      .map(h => ({ ...h }));
  }

  /* ─── Preview de draw ─── */
  const drawPreview = useMemo(() => {
    if (!isDrawing || !drawStart || !drawEnd) return null;
    const inicio = Math.min(drawStart.minuto, drawEnd.minuto);
    const fin = Math.max(drawStart.minuto, drawEnd.minuto);
    if (fin - inicio < SNAP_MINUTES) return null;

    const diaIndex = DIAS_SEMANA.indexOf(drawStart.dia);
    const top = ((inicio / 60) - horaMin) * rowHeight;
    const height = ((fin - inicio) / 60) * rowHeight;

    return { diaIndex, top, height, dia: drawStart.dia, inicio, fin };
  }, [isDrawing, drawStart, drawEnd, horaMin, rowHeight]);

  /* ─── Preview de resize ─── */
  const resizePreview = useMemo(() => {
    if (!resizeData?.newFin) return null;
    const bloque = resizeData.bloque;
    const iniMin = timeToMinutes(horaStr(bloque.hora_inicio));
    const top = ((iniMin / 60) - horaMin) * rowHeight;
    const height = ((resizeData.newFin - iniMin) / 60) * rowHeight;
    return { top, height, diaIndex: DIAS_SEMANA.indexOf(bloque.dia_semana) };
  }, [resizeData, horaMin, rowHeight]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="hidden md:block select-none">
        {/* Encabezado días */}
        <div className="grid grid-cols-[36px_repeat(7,1fr)] border-b"
          style={{ borderColor: modoOscuro ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,1)' }}>
          <div />
          {DIAS_SEMANA.map(dia => {
            const tieneHorarios = horarios.some(h => h.dia_semana === dia);
            const esHoy = new Date().getDay() === dia;
            return (
              <div key={dia}
                className={`py-2 text-center text-xs uppercase tracking-wider border-l
                  ${tieneHorarios
                    ? modoOscuro ? 'text-slate-300 font-bold' : 'text-slate-600 font-bold'
                    : modoOscuro ? 'text-slate-600 font-normal' : 'text-slate-400 font-normal'
                  }
                  ${modoOscuro ? 'border-slate-800' : 'border-slate-100'}`}>
                  {DIAS_SEMANA_LABEL[DIAS_SEMANA.indexOf(dia)]}
                  {esHoy && <span className="block mx-auto mt-1 w-1 h-1 rounded-full bg-amber-400" />}
              </div>
            );
          })}
        </div>

        {/* Grid de horas */}
        <div
          ref={gridRef}
          className={`relative grid grid-cols-[36px_repeat(7,1fr)] ${drawMode ? 'cursor-crosshair' : ''}`}
          style={{ height: `${horas.length * rowHeight}px` }}
          onPointerDown={handleGridPointerDown}
          onPointerMove={handleGridPointerMove}
          onPointerUp={handleGridPointerUp}
        >
          {/* Labels de hora */}
          {horas.map((h, i) => (
            <div key={h}
              className={`absolute text-[10px] font-semibold tabular-nums ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}
              style={{ left: 0, width: colHoraWidth, top: `${i * rowHeight}px`, height: rowHeight, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 0 }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}

          {/* Columnas */}
          {DIAS_SEMANA.map((dia, idx) => (
            <ColumnaDia
              key={dia}
              dia={dia}
              className={`relative border-l ${modoOscuro ? 'border-slate-800' : 'border-slate-100'}`}
              style={{ gridColumn: idx + 2 }}
            >
              {/* Líneas de hora */}
              {horas.map((h, i) => (
                <div key={h} className={`absolute w-full border-t
                  ${modoOscuro ? 'border-slate-800/40' : 'border-slate-100'}`}
                  style={{ top: `${i * rowHeight}px`, height: `${rowHeight}px` }} />
              ))}

              {/* Bloques de entrenamiento */}
              {getBloquesPorDia(dia).map(bloque => (
                <div key={bloque.id_horario} data-bloque className="group">
                  <BloqueDraggable
                    bloque={bloque}
                    rowHeight={rowHeight}
                    horaMin={horaMin}
                    puedeVer={puedeVer}
                    onEditar={onEditar}
                    onEliminar={onEliminar}
                    onDoubleClick={onEditar}
                    modoOscuro={modoOscuro}
                    onResizeStart={handleResizeStart}
                  />
                </div>
              ))}

              {/* Preview de draw-to-create */}
              {drawPreview && drawPreview.dia === dia && (
                <div
                  className="absolute left-0.5 right-0.5 rounded-md bg-amber-400/15 border border-dashed border-amber-400/40 pointer-events-none"
                  style={{ top: `${drawPreview.top + 1}px`, height: `${drawPreview.height - 2}px` }}
                >
                  <p className="text-[9px] font-bold text-amber-400/70 px-1 pt-0.5">
                    {minutesToTime(drawPreview.inicio)}–{minutesToTime(drawPreview.fin)}
                  </p>
                </div>
              )}

              {/* Preview de resize */}
              {resizePreview && resizePreview.diaIndex === idx && (
                <div
                  className="absolute left-0.5 right-0.5 rounded-md border-2 border-dashed border-amber-400/50 pointer-events-none"
                  style={{ top: `${resizePreview.top + 1}px`, height: `${resizePreview.height - 2}px` }}
                />
              )}

              {/* Preview de drag — indica dónde caerá el bloque */}
              {dragPreview && dragPreview.diaIndex === idx && (
                <div
                  className={`absolute left-0.5 right-0.5 rounded-md border-2 border-dashed pointer-events-none
                    ${modoOscuro ? 'border-amber-400/50 bg-amber-400/10' : 'border-amber-400/60 bg-amber-50'}`}
                  style={{ top: `${dragPreview.top + 1}px`, height: `${dragPreview.height - 2}px` }}
                >
                  <p className={`text-[9px] font-bold px-1 pt-0.5
                    ${modoOscuro ? 'text-amber-400/80' : 'text-amber-600/80'}`}>
                    {minutesToTime(dragPreview.inicio)}–{minutesToTime(dragPreview.fin)}
                  </p>
                </div>
              )}
            </ColumnaDia>
          ))}
        </div>
      </div>

      {/* DragOverlay — portal del bloque fantasma */}
      <DragOverlay dropAnimation={null}>
        {activeBloque ? (
          <BloqueOverlay bloque={activeBloque} rowHeight={rowHeight} horaMin={horaMin} modoOscuro={modoOscuro} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
