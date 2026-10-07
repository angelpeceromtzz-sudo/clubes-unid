/* Menú de acciones agrupadas bajo un botón "Más".
 *
 * Local a la carpeta de encuestas y no en el kit: por ahora tiene un solo
 * consumidor. Si aparece un segundo sitio con el mismo problema, se sube a
 * `src/components/ui` sin cambiar la API.
 *
 * El patrón (overlay + `useClickOutside` + tokens `dropdown*` del tema) está
 * copiado de `MenuUsuario.jsx`. Lo que se le añade:
 *
 * - Escape cierra. `useClickOutside` sólo escucha `mousedown` fuera, y en
 *   teclado no hay `mousedown` que capturar.
 * - `aria-haspopup` / `aria-expanded` en el botón, y `role="menu"` en el panel:
 *   sin esto un lector de pantalla anuncia un botón sin relación con la lista
 *   que abre.
 * - El foco vuelve al botón al cerrar. Al abrir se lo lleva el primer ítem, y si
 *   el usuario cierra con Escape el foco se queda en un nodo que ya no existe.
 * - Áreas táctiles de 44px y `py-3` en móvil: `py-2.5` como el de `MenuUsuario`
 *   queda por debajo del mínimo recomendado en un menú de acciones de dedo.
 */
import { useEffect, useRef, useState } from 'react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { useTheme } from '../../../contexts/ThemeContext';
import { Icono } from '../../ui/Icono';

export function MenuAcciones({ etiqueta = 'Más', items, deshabilitado }) {
  const { tema } = useTheme();
  // El estado vive aquí y no en el padre porque el menú se monta una vez por
  // fila: un único `abierto` compartido en la lista haría que al abrir uno se
  // abrieran todos.
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const primerItemRef = useRef(null);

  useClickOutside(contenedorRef, abierto, () => setAbierto(false));

  // Escape cierra y devuelve el foco al botón. Sólo se escucha mientras el menú
  // está abierto: un `keydown` global siempre activo cerraría este menú desde
  // cualquier parte del panel.
  useEffect(() => {
    if (!abierto) return;

    function alPulsarTecla(e) {
      if (e.key === 'Escape') {
        setAbierto(false);
        botonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', alPulsarTecla);

    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [abierto]);

  // Al abrir, el foco entra al menú: si se queda en el botón, un teclado parece
  // no hacer nada hasta que el usuario adivine que hay una lista abajo.
  useEffect(() => {
    if (abierto) primerItemRef.current?.focus();
  }, [abierto]);

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={deshabilitado}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`${etiqueta} acciones`}
        className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          tema.isDark
            ? 'border-slate-600 text-slate-300 hover:bg-slate-800'
            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
        }`}
      >
        <Icono nombre="dots-horizontal" className="h-4 w-4" />
        {etiqueta}
      </button>

      {abierto && (
        <>
          {/* Overlay para cerrar tocando fuera. Es también lo que hace el
              `mousedown` de `useClickOutside`, pero sin él el toque en móvil
              llega tarde y el menú tapa el contenido mientras se espera. */}
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />

          <div
            role="menu"
            className={`absolute right-0 top-full mt-1 z-50 min-w-[11rem] rounded-xl border py-1 shadow-2xl ${tema.dropdownBg} ${tema.dropdownBorder}`}
          >
            {items.map((item, i) => (
              <button
                key={item.clave}
                ref={i === 0 ? primerItemRef : null}
                type="button"
                role="menuitem"
                disabled={item.deshabilitado}
                onClick={() => {
                  setAbierto(false);
                  item.onClick();
                }}
                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors rounded-lg flex items-center gap-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${tema.dropdownItem} ${tema.text} ${
                  item.peligro ? 'text-red-400' : ''
                }`}
              >
                {item.icono && <Icono nombre={item.icono} className="h-4 w-4 shrink-0" />}
                {item.texto}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}