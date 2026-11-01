import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export function ListadoConVerTodos({ items, limite = 10, renderItem, textoPlural = 'elementos', textoSingular = 'elemento', vacio }) {
  const { modoOscuro } = useTheme();
  const [mostrarTodos, setMostrarTodos] = useState(false);

  if (!items || items.length === 0) {
    return vacio || null;
  }

  const visibles = mostrarTodos ? items : items.slice(0, limite);
  const total = items.length;
  const quedan = total - limite;

  return (
    <div>
      <p className={`text-xs mb-2 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
        Mostrando {visibles.length} de {total} {total === 1 ? textoSingular : textoPlural}
      </p>
      <div className="space-y-1">
        {visibles.map((item, i) => renderItem(item, i))}
      </div>
      {quedan > 0 && !mostrarTodos && (
        <button
          type="button"
          onClick={() => setMostrarTodos(true)}
          className="mt-3 text-sm font-medium text-blue-500 hover:text-blue-600"
        >
          Ver todos ({quedan} más)
        </button>
      )}
      {mostrarTodos && total > limite && (
        <button
          type="button"
          onClick={() => setMostrarTodos(false)}
          className="mt-3 text-sm font-medium text-blue-500 hover:text-blue-600"
        >
          Ver menos
        </button>
      )}
    </div>
  );
}
