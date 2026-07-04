/* Tarjeta de estadística con título, valor numérico, icono SVG inline y color de fondo/borde. */
export function TarjetaStat({ titulo, valor, icono, color }) {
  return (
    <div className={`rounded-xl border p-5 ${color} transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium opacity-80">{titulo}</p>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icono} />
        </svg>
      </div>
      <p className="text-3xl font-black mt-2">{valor ?? '—'}</p>
    </div>
  );
}
