import { useTheme } from '../../../contexts/ThemeContext';

const ESTADOS = ["Todos", "Abiertos", "Proximos", "Cerrados"];

export function FiltrosEstado({ estadoActivo, setEstadoActivo, variante = 'desktop' }) {
  const { tema } = useTheme();

  if (variante === 'mobile') {
    return (
      <div
        className="flex items-center gap-2.5 px-5 py-2.5 overflow-x-auto justify-center"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <style>{`.nf-mobile-filter::-webkit-scrollbar { display: none; }`}</style>
        {ESTADOS.map((est) => (
          <button
            key={est}
            onClick={() => setEstadoActivo(est)}
            className={`nf-mobile-filter shrink-0 font-bold text-xs tracking-wide px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer active:scale-95 ${
              estadoActivo === est ? tema.btnActive : tema.btnInactive
            }`}
          >
            {est}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-1">
      {ESTADOS.map((est) => (
        <button
          key={est}
          onClick={() => setEstadoActivo(est)}
          className={`font-semibold text-xs lg:text-sm tracking-wide px-3 py-1.5 transition-all duration-200 cursor-pointer active:scale-95 ${
            estadoActivo === est
              ? 'rounded-full text-white bg-amber-500 shadow-sm shadow-amber-500/30'
              : `rounded-md ${tema.btnInactive}`
          }`}
        >
          {est}
        </button>
      ))}
    </nav>
  );
}
