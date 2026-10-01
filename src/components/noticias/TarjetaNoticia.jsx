/* Tarjeta de noticia de la página /noticias: muestra el contenido completo cuando cabe
   en 50 palabras; si es más largo, recorta el texto y ofrece un botón "Ver más" que
   solo expande la noticia al pulsarlo. */
import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { obtenerUrlImagen } from '../../utils/imagen';
import { contarPalabras, fechaCorta, fechaRelativa, recortarPalabras } from '../../utils/formato';

const LIMITE_PALABRAS = 50;

export function TarjetaNoticia({ noticia }) {
  const { tema, modoOscuro } = useTheme();
  const [expandida, setExpandida] = useState(false);

  const tieneMas = contarPalabras(noticia.contenido) > LIMITE_PALABRAS;
  const contenido = tieneMas && !expandida
    ? recortarPalabras(noticia.contenido, LIMITE_PALABRAS)
    : noticia.contenido;

  return (
    <article
      className={`rounded-2xl border overflow-hidden transition-colors duration-300 ${
        modoOscuro
          ? 'bg-[#0e162c] border-slate-700/50'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {noticia.url_imagen && (
        <div className="w-full h-52 sm:h-72 overflow-hidden">
          <img
            src={obtenerUrlImagen(noticia.url_imagen)}
            alt={noticia.titulo}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {noticia.destacada && (
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Destacada
            </span>
          )}
          <span className={`text-[10px] ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
            {fechaRelativa(noticia.fecha_publicacion)}
          </span>
        </div>

        <h2 className={`text-lg sm:text-xl font-black leading-snug ${tema.title}`}>
          {noticia.titulo}
        </h2>

        <p className={`mt-3 text-sm leading-relaxed whitespace-pre-line break-words ${tema.subtitle}`}>
          {contenido}
        </p>

        {tieneMas && (
          <button
            type="button"
            onClick={() => setExpandida((prev) => !prev)}
            className={`mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              modoOscuro ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-500'
            }`}
          >
            {expandida ? 'Ver menos' : 'Ver más'}
            <Icono
              nombre={expandida ? 'chevron-up' : 'chevron-down'}
              strokeWidth={2.5}
              className="h-3 w-3"
            />
          </button>
        )}

        <p className={`mt-4 text-[10px] uppercase tracking-wider ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
          Publicado el {fechaCorta(noticia.fecha_publicacion)}
        </p>
      </div>
    </article>
  );
}
