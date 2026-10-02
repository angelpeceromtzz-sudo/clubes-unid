import { useDroppable } from '@dnd-kit/core';

export function ColumnaDia({ dia, children, className, style }) {
  const { setNodeRef, isOver } = useDroppable({ id: `dia-${dia}` });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'bg-amber-400/5' : ''}`} style={style}>
      {children}
    </div>
  );
}
