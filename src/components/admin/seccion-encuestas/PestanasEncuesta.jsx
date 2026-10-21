/* Pestañas de la encuesta abierta: Preguntas / Resultados / Configuración.
 *
 * Local a la carpeta de encuestas, como el menú de acciones: un solo consumidor.
 *
 * Decisiones que no son obvias:
 *
 * - Subrayado ámbar en vez de las píldoras de `PestanasMovilPorRol`. Aquel
 *   componente es navegación por rol en móvil y su forma de cápsula con
 *   `rounded-full` funciona como filtro, no como sección. Aquí son tres vistas
 *   del mismo objeto y el subrayado es lo que dice "sigue en la misma página".
 *
 * - La línea de la fila no es un `border-b` del contenedor sino un elemento
 *   absoluto. El truco clásico para que la pestaña activa tape la línea
 *   (`border-b-2` en el botón + `-mb-px`) hace que el botón se painted 1 px por
 *   debajo de la caja del contenedor: sin barra vertical visible, pero en
 *   cuanto el contenedor lleva `overflow-x-auto` (el scroll horizontal del
 *   móvil) ese 1 px se convierte en una barra vertical de 1 px al lado de las
 *   pestañas. Con la línea como elemento absoluto y los botones con
 *   `relative z-10`, el desbordamiento vertical es cero y el scroll horizontal
 *   no genera barra vertical.
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
    // El módulo es de tres pestañas, pero el índice se calcula con módulo para
    // que no se rompa si mañana se agrega una cuarta.
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
    <div
      role="tablist"
      aria-label="Vistas de la encuesta"
      className="relative flex gap-3 sm:gap-5 overflow-x-auto"
    >
      {/* La línea de la fila. Va por debajo de los botones (los botones son
          `relative z-10`), así que el subrayado ámbar de la pestaña activa la
          tapa y en el resto de la fila se ve la línea gris. No usa `border-b`
          en el contenedor para no depender del truco del `-mb-px`, que
          desbordaba 1 px en vertical. */}
      <span
        aria-hidden="true"
        className={`absolute left-0 right-0 bottom-0 border-b ${tema.headerBorder}`}
      />

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
            // Tab. Sin esto el teclado recorre las tres y luego las flechas no
            // sirven de nada, que es justo para lo que están.
            tabIndex={seleccionada ? 0 : -1}
            onClick={() => onCambio(pestana.clave)}
            onKeyDown={(e) => alPulsarTecla(e, indice)}
            className={`relative z-10 pb-2.5 text-sm font-bold transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
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
