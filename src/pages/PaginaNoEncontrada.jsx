/* Página 404 del sitio: ninguna ruta declarada coincide con la URL. Se
   monta sin navbar ni navegación inferior (return temprano en App.jsx), y
   también dentro del grupo de la encuesta como respaldo de su <Routes> propio.
   No registra alias ni redirige: una ruta desconocida —incluida la versión mal
   escrita de /acerca-del-proyecto— siempre sirve este contenido. */
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const FOCO_PRIMARIO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

export function PaginaNoEncontrada() {
  const { tema } = useTheme();

  return (
    <main className={`flex min-h-[60vh] items-center justify-center px-6 ${tema.bg} ${tema.text}`}>
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-500">Error 404</p>
        <h1 className={`mt-3 text-3xl sm:text-4xl font-black tracking-tight ${tema.title}`}>
          Página no encontrada
        </h1>
        <p className={`mt-3 text-sm sm:text-base leading-relaxed ${tema.subtitle}`}>
          La ruta que intentas abrir no existe o fue movida. Vuelve al inicio para explorar los clubes.
        </p>
        <Link
          to="/campus/campeche/portal"
          className={`mt-6 inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full bg-amber-400 text-[#0e162c] font-black text-sm transition duration-200 hover:bg-amber-300 active:scale-[0.98] ${FOCO_PRIMARIO}`}
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
