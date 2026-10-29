import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';

export function BarraGeneral({ onLoginClick }) {
  const { modoOscuro } = useTheme();
  const oscuro = modoOscuro;

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${oscuro ? 'bg-[#0b111e]/85 border-slate-800' : 'bg-white/85 border-slate-200'}`}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center shrink-0" aria-label="Clubs UNID">
          <img src="/lobounid.png" alt="Lobo UNID" className="h-10 w-auto object-contain self-center" />
          <img src="/clubsUNID.png" alt="Clubs UNID" className="h-12 w-auto object-contain self-center" />
        </Link>
        <nav className="flex flex-wrap items-center gap-4 sm:gap-5 text-sm font-bold">
          <Link to="/oferta" className="hover:text-amber-400 transition">Oferta</Link>
          <Link to="/experiencia-estudiantil" className="hover:text-amber-400 transition">Experiencia Estudiantil</Link>
          <Link to="/campus" className="hover:text-amber-400 transition">Campus</Link>
          <Link to="/conocenos" className="hover:text-amber-400 transition">Conócenos</Link>
          {onLoginClick && (
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-amber-400 text-[#0e162c] font-black hover:bg-amber-300 transition"
            >
              Iniciar sesión
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
