import { createPortal } from 'react-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';

const CATEGORIAS = ["Todos", "Deportes", "Cultura", "Tecnología"];

export function DesplegableCategoria({ categoriaActiva, setCategoriaActiva, setMenuCategoria, esMobile, dropdownPos }) {
  const { tema } = useTheme();

  const lista = (
    <div
      className={`rounded-xl border shadow-2xl py-1 ${tema.dropdownBg} ${tema.dropdownBorder}`}
      style={{ animation: 'dropdownIn 0.15s ease-out' }}
    >
      {CATEGORIAS.map((cat) => (
        <button
          key={cat}
          onClick={() => { setCategoriaActiva(cat); setMenuCategoria(false); }}
          className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg mx-1 cursor-pointer ${tema.dropdownItem} ${tema.text} flex items-center justify-between`}
          style={{ width: 'calc(100% - 8px)' }}
        >
          {cat}
          {categoriaActiva === cat && (
            <Icono nombre="check" strokeWidth={2.5} className="h-4 w-4 text-amber-400" />
          )}
        </button>
      ))}
    </div>
  );

  if (esMobile) {
    return createPortal(
      <div
        className="nf-mobile-cat-dropdown fixed z-50 w-48"
        style={{ top: dropdownPos.top, left: dropdownPos.left }}
      >
        {lista}
      </div>,
      document.body
    );
  }

  return lista;
}
