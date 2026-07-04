/* Encabezado de página con título, subtítulo opcional y un área para acciones (botones). */
export function EncabezadoPagina({ titulo, subtitulo, accion }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">{titulo}</h2>
        {subtitulo && <p className="text-sm text-slate-400 mt-0.5">{subtitulo}</p>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}
