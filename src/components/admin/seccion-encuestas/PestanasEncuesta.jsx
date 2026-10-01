/* Pestañas de la encuesta abierta: Preguntas / Resultados.
 *
 * Local a la carpeta de encuestas, como el menú de acciones: un solo consumidor.
 *
 * Decisiones que no son obvias:
 *
 * - Subrayado ámbar en vez de las píldoras de `PestanasMovilPorRol`. Aquel
 *   componente es navegación por rol en móvil y su forma de cápsula con
 *   `rounded-full` funciona como filtro, no como sección. Aquí son dos vistas
 *   del mismo objeto y el subrayado es lo que dice "sigue en la misma página".
 *
 * - Navegación con flechas. El patrón de tabs de WAI-ARIA mueve el foco con
 *   ←/→ y activa con Enter o Espacio, y Home/End saltan a los extremos. Sin
 *   esto el `role="tablist"` queda a medias: se declara la relación pero el
 *   teclado no la respeta.
 *
 * - Sólo flechas mueven el foco; la activación es explícita. Mover el foco ya
 *   no cambia de pestaña, como en cualquier tablist.
 */
import { useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

export function PestanasEncuesta({ pestanas, activa, onCambio }) {
  const { tema } = useTheme();
  const refs = useRef([]);

  const moverFoco = (indice) => {
    const total = pestanas.length;
    // El módulo es de dos pestañas, pero el índice se calcula con módulo para
    // que no se rompa si mañana se agrega una tercera.
    const siguiente = (indice + total) % total;

    refs.current[siguiente]?.focus();
  };

  const alPulsarTecla = (e, indice) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        moverFoco(indice + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moverFoco(indice - 1);
        break;
      case 'Home':
        e.preventDefault();
        moverFoco(0);
        break;
      case 'End':
        e.preventDefault();
        moverFoco(pestanas.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div role="tablist" aria-label="Vistas de la encuesta" className="flex gap-5 border-b">
      {pestanas.map((pestana, indice) => {
        const seleccionada = pestana.clave === activa;

        return (
          <button
            key={pestana.clave}
            ref={(el) => {
              refs.current[indice] = el;
            }}
            type="button"
            role="tab"
            id={`pestana-${pestana.clave}`}
            aria-selected={seleccionada}
            aria-controls={`panel-${pestana.clave}`}
            // `tabIndex` de roving: sólo la pestaña activa es alcanzable con
            // Tab. Sin esto el teclado recorre las dos y luego las flechas no
            // sirven de nada, que es justo para lo que están.
            tabIndex={seleccionada ? 0 : -1}
            onClick={() => onCambio(pestana.clave)}
            onKeyDown={(e) => alPulsarTecla(e, indice)}
            className={`pb-2.5 text-sm font-bold transition-colors cursor-pointer border-b-2 -mb-px ${
              seleccionada
                ? 'border-amber-400 text-amber-400'
                : `border-transparent ${tema.subtitle} hover:text-slate-200`
            }`}
          >
            {pestana.etiqueta}
          </button>
        );
      })}
    </div>
  );
}