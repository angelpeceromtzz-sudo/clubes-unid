/* Pie de página con información de la universidad, categorías, contacto y redes sociales. */
import { useTheme } from '../../contexts/ThemeContext';

export function PiePagina() {
  const { tema } = useTheme();
  return (
    <footer className={`border-t transition-colors duration-300 ${tema.headerBorder} ${tema.bg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white font-black text-sm">
                U
              </div>
              <div>
                <span className={`text-base font-black tracking-tight ${tema.logoText}`}>UNID</span>
                <p className="text-[9px] uppercase tracking-widest text-amber-400 font-bold leading-tight">
                  Clubs Lobos Rojos
                </p>
              </div>
            </div>
            <p className={`text-xs leading-relaxed ${tema.subtitle} max-w-xs`}>
              Descubre, participa y lidera en los clubes universitarios UNID. Forma parte de la manada.
            </p>
          </div>

          <div>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${tema.title}`}>Categorías</h3>
            <ul className="space-y-2">
              {["Deportes", "Cultura", "Tecnología"].map((cat) => (
                <li key={cat}>
                  <span className={`text-xs font-medium transition-colors duration-200 cursor-pointer hover:text-amber-400 ${tema.subtitle}`}>
                    {cat}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${tema.title}`}>Contacto</h3>
            <ul className="space-y-2">
              <li className={`text-xs font-medium ${tema.subtitle}`}>contacto@unid.mx</li>
              <li className={`text-xs font-medium ${tema.subtitle}`}>+52 981 123 4567</li>
              <li className={`text-xs font-medium ${tema.subtitle}`}>Campeche, Campeche, MX</li>
            </ul>
          </div>

          <div>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${tema.title}`}>Síguenos</h3>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/RedUNID/" target="_blank" rel="noopener noreferrer" className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 hover:bg-amber-400 hover:text-[#0e162c] hover:border-amber-400 ${tema.subtitle} ${tema.headerBorder}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
      <a href="https://www.instagram.com/RedUNID/" target="_blank" rel="noopener noreferrer" className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 hover:bg-amber-400 hover:text-[#0e162c] hover:border-amber-400 ${tema.subtitle} ${tema.headerBorder}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
      </a>
      <a href="https://x.com/RedUNID" target="_blank" rel="noopener noreferrer" className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 hover:bg-amber-400 hover:text-[#0e162c] hover:border-amber-400 ${tema.subtitle} ${tema.headerBorder}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </a>
      <a href="https://www.youtube.com/user/RedUNID" target="_blank" rel="noopener noreferrer" className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 hover:bg-amber-400 hover:text-[#0e162c] hover:border-amber-400 ${tema.subtitle} ${tema.headerBorder}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
      </a>

            </div>
          </div>

        </div>

        <div className={`mt-6 sm:mt-10 pt-4 sm:pt-6 border-t transition-colors duration-300 ${tema.headerBorder}`}>
          <p className={`text-[10px] text-center font-medium ${tema.subtitle}`}>
            &copy; {new Date().getFullYear()} UNID &mdash; Universidad Hispanoamericana de Oriente. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
