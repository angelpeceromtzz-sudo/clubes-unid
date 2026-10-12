/* Selector de categorías del catálogo. Vive junto al título "Explorar Clubes Disponibles"
   y sustituye al desplegable que antes estaba en la barra de navegación. */
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useClickOutside } from '../../hooks/useClickOutside';
import { Icono } from '../ui/Icono';
import { DesplegableCategoria } from '../layout/navegacion/DesplegableCategoria';

export function SelectorCategoria({ categoriaActiva, setCategoriaActiva }) {
  const { tema } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const [esMobile, setEsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const botonRef = useRef(null);

  useClickOutside(botonRef, abierto, () => setAbierto(false), '.nf-mobile-cat-dropdown');

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setEsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useLayoutEffect(() => {
    if (esMobile && abierto && botonRef.current) {
      const rect = botonRef.current.getBoundingClientRect();
      const dropdownWidth = 192;
      const safePadding = 8;
      const left = rect.left + dropdownWidth > window.innerWidth
        ? window.innerWidth - dropdownWidth - safePadding
        : rect.left;
      setDropdownPos({ top: rect.bottom + 4, left });
    }
  }, [esMobile, abierto]);

  const etiqueta = categoriaActiva === 'Todos' ? 'Categorías' : `Categoría: ${categoriaActiva}`;

  return (
    <div className="relative" ref={botonRef}>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setAbierto((v) => !v)}
        className={`inline-flex items-center gap-1 font-semibold text-xs lg:text-sm tracking-wide px-3 py-1.5 transition-all duration-200 cursor-pointer active:scale-95 ${
          categoriaActiva !== 'Todos'
            ? 'rounded-full text-white bg-amber-500 shadow-sm shadow-amber-500/30'
            : `rounded-md ${tema.btnInactive}`
        }`}
      >
        <Icono nombre="grid" className="h-3.5 w-3.5" strokeWidth={2} />
        {etiqueta}
        <Icono nombre="chevron-down" strokeWidth={2.5} className={`h-3 w-3 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && !esMobile && (
        <div className="absolute top-full left-0 mt-1 z-40">
          <DesplegableCategoria
            categoriaActiva={categoriaActiva}
            setCategoriaActiva={setCategoriaActiva}
            setMenuCategoria={setAbierto}
            esMobile={false}
            dropdownPos={dropdownPos}
          />
        </div>
      )}

      {abierto && esMobile && (
        <DesplegableCategoria
          categoriaActiva={categoriaActiva}
          setCategoriaActiva={setCategoriaActiva}
          setMenuCategoria={setAbierto}
          esMobile={true}
          dropdownPos={dropdownPos}
        />
      )}
    </div>
  );
}
