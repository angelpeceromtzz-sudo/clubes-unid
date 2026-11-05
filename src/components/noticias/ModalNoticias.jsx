/* Popup automático de la portada: muestra únicamente la noticia más reciente que el
   visitante todavía no ha visto, con botón de cierre. El historial se abre en la ventana Noticias. */
import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { ImagenAmpliable } from '../ui/ImagenAmpliable';
import { useTheme } from '../../contexts/ThemeContext';
import { useNoticias } from '../../contexts/NoticiasContext';
import { obtenerUrlImagen } from '../../utils/imagen';
import { fechaCorta, fechaRelativa } from '../../utils/formato';
import { estiloPublicacion } from '../../constants/publicaciones';

export function ModalNoticias() {
  const { tema, modoOscuro } = useTheme();
  const { modal, destacada, cerrarModal } = useNoticias();

  if (modal !== 'destacada' || !destacada) return null;
  const color = estiloPublicacion(destacada.categoria, modoOscuro);
  const urlImagen = obtenerUrlImagen(destacada.url_imagen);

  return (
    <ModalBase show onClose={cerrarModal} maxWidth="max-w-xl">
      <button
        onClick={cerrarModal}
        aria-label="Cerrar"
        className={`absolute top-3 right-3 z-10 p-1.5 rounded-full transition-colors cursor-pointer ${
          modoOscuro
            ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
        }`}
      >
        <Icono nombre="close" strokeWidth={2.5} className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${color.badge}`}>
          <Icono nombre={color.icono} className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {color.label}
          </span>
        </div>
        <h2 className={`mt-1 text-lg font-black leading-snug ${tema.title}`}>
          {destacada.titulo}
        </h2>
        <p className={`text-[10px] mt-1 ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          {fechaRelativa(destacada.fecha_publicacion)}
        </p>
      </div>

      <ImagenAmpliable
        key={destacada.id_noticia}
        src={urlImagen}
        alt={destacada.titulo}
        titulo={destacada.titulo}
        className="group relative mt-4 block h-52 w-full max-w-full cursor-zoom-in overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:h-64"
      >
        <img
          src={urlImagen}
          alt={destacada.titulo}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </ImagenAmpliable>

      <p className={`mt-4 text-sm leading-relaxed whitespace-pre-line break-words ${tema.subtitle}`}>
        {destacada.contenido}
      </p>

      <p className={`mt-4 text-[10px] uppercase tracking-wider ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
        Publicado el {fechaCorta(destacada.fecha_publicacion)}
      </p>
    </ModalBase>
  );
}
