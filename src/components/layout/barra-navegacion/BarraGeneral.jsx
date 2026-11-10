import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useScrollHeader } from '../../../hooks/useScrollHeader';

export function BarraGeneral({ onLoginClick, splashActivo = false, flotante = false }) {
  const { tema, modoOscuro } = useTheme();
  const oscuro = modoOscuro;
  const { scrolled } = useScrollHeader();
  const [menuAbierto, setMenuAbierto] = useState(false);

  function cerrarMenu() {
    setMenuAbierto(false);
  }

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
        flotante
          ? (modoOscuro
              ? (!scrolled
                  ? 'bg-gradient-to-b from-slate-950/100 via-slate-950/75 to-slate-950/0 backdrop-blur-[1px] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border-transparent'
                  : `${tema.headerBg} ${tema.headerBorder} backdrop-blur-md border-b`)
              : `${tema.headerBg} ${tema.headerBorder} border-b`)
          : (oscuro ? 'backdrop-blur-md border-b bg-[#0b111e]/85 border-slate-800' : 'backdrop-blur-md border-b bg-white/85 border-slate-200')
      }`}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:max-w-none lg:mx-0 lg:px-12 xl:px-16 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center shrink-0" aria-label="Clubs UNID">
          <img draggable={false} src="/branding/lobounid.png" alt="Lobo UNID" id="navbar-logo" className={`h-8 sm:h-10 w-auto object-contain self-center transition-opacity duration-200 ${splashActivo ? 'opacity-0' : 'opacity-100'}`} />
          <img draggable={false} src={oscuro ? '/branding/clubs-unid.png' : '/branding/clubs-unid-modoclaro.png'} alt="Clubs UNID" className="h-9 sm:h-12 w-auto object-contain self-center -ml-1 sm:ml-0" />
        </Link>

        <nav className={`hidden md:flex items-center gap-5 text-sm font-bold ${flotante && modoOscuro && !scrolled ? 'text-white' : ''}`}>
          <Link to="/oferta" className="hover:text-amber-400 transition">Oferta</Link>
          <Link to="/experiencia-estudiantil" className="hover:text-amber-400 transition">Experiencia Estudiantil</Link>
          <Link to="/campus" className="hover:text-amber-400 transition">Campus</Link>
          <Link to="/conocenos" className="hover:text-amber-400 transition">Conócenos</Link>
          {onLoginClick && (
            <button
              type="button"
              onClick={onLoginClick}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-amber-400 text-[#0e162c] font-black hover:bg-amber-300 transition cursor-pointer"
            >
              Iniciar sesión
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMenuAbierto((prev) => !prev)}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          className="md:hidden inline-flex items-center justify-center p-2 rounded-full text-white hover:text-amber-400 transition cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {menuAbierto ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuAbierto && (
        <div className="md:hidden border-t border-slate-800 bg-[#0b111e]/95 backdrop-blur-md">
          <nav className="px-6 py-4 flex flex-col gap-3 text-sm font-bold">
            <Link to="/oferta" onClick={cerrarMenu} className="hover:text-amber-400 transition">Oferta</Link>
            <Link to="/experiencia-estudiantil" onClick={cerrarMenu} className="hover:text-amber-400 transition">Experiencia Estudiantil</Link>
            <Link to="/campus" onClick={cerrarMenu} className="hover:text-amber-400 transition">Campus</Link>
            <Link to="/conocenos" onClick={cerrarMenu} className="hover:text-amber-400 transition">Conócenos</Link>
            {onLoginClick && (
              <button
                type="button"
                onClick={() => {
                  onLoginClick();
                  cerrarMenu();
                }}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-amber-400 text-[#0e162c] font-black hover:bg-amber-300 transition cursor-pointer"
              >
                Iniciar sesión
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
    {!flotante && <div className="h-16" aria-hidden="true" />}
    </>
  );
}
