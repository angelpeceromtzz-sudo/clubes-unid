import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

function etiquetaReconocimiento(item) {
  const nombre = item.plantilla === 'trineo'
    ? 'TS'
    : item.plantilla === 'misiones'
      ? 'Misiones'
      : item.actividad;
  return `${nombre}${item.anio ? ` ${item.anio}` : ''}`;
}

function ImagenInsignia({ item }) {
  const [error, setError] = useState(false);
  if (!item.insignia_key || error) return <span aria-hidden="true">🏅</span>;

  return (
    <img
      src={`/images/insignias/${item.insignia_key}.png`}
      alt={`Insignia de ${item.actividad} ${item.anio}`}
      onError={() => setError(true)}
      className="h-12 w-12 shrink-0 object-contain"
    />
  );
}

export function ListaReconocimientos({ items = [], mensajeVacio = 'Aún no tienes insignias.' }) {
  const { modoOscuro } = useTheme();

  if (!items.length) {
    return <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{mensajeVacio}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id_reconocimiento}
          title={`${item.actividad} · ${item.edicion}`}
          className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-bold ${modoOscuro ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : 'border-amber-500/40 bg-amber-50 text-amber-800'}`}
        >
          <ImagenInsignia item={item} />
          {etiquetaReconocimiento(item)}
        </span>
      ))}
    </div>
  );
}
