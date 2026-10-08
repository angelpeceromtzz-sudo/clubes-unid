// Fondo visual de las pantallas de encuesta: color de tema + marca de agua.
//
// lobounid.png (public/) es un PNG transparente con tonos dorados: al medirlo,
// la mitad de sus píxeles opacos son oscuros y otra buena parte es casi blanca
// (promedio RGB 151,112,32). Por eso el tratamiento cambia según el tema:
// - oscuro: casi tal cual, con un poco de brillo extra, porque las luces
//   resaltan sobre #0b111e y los trazos oscuros siguen siendo visibles.
// - claro: se oscurece con un filtro; sin él, los píxeles claros desaparecen
//   sobre el blanco y la marca se vería a medio consumir.
//
// En el formulario público la marca va fija a la ventana (fixed) para que se
// mantenga visible detrás del formulario al hacer scroll. `contenida` es para
// la vista previa del panel: ahí el modal es el contenedor y la marca se
// centra dentro del contenido con position absoluto.
import { useTheme } from '../../contexts/ThemeContext';

export function FondoEncuesta({ children, contenida = false }) {
  const { modoOscuro, tema } = useTheme();

  const marca = (
    <img
      src="/lobounid.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${
        contenida ? 'w-[min(60vw,18rem)]' : 'w-[min(85vw,640px)]'
      } ${modoOscuro ? 'opacity-25 brightness-110' : 'opacity-[0.14] brightness-[0.55] saturate-150'}`}
    />
  );

  if (contenida) {
    return (
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
        >
          {marca}
        </div>
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${tema.bg} ${tema.text}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center"
      >
        {marca}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
