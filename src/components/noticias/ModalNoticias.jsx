/* Popup automático de la portada: muestra únicamente la noticia más reciente que el
   visitante todavía no ha visto, con botón de cierre. El listado completo vive en /noticias. */
import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { useNoticias } from '../../contexts/NoticiasContext';
import { obtenerUrlImagen } from '../../utils/imagen';
import { fechaCorta, fechaRelativa } from '../../utils/formato';

export function ModalNoticias() {
  const { tema, modoOscuro } = useTheme();
  const { modal, destacada, cerrarModal } = useNoticias();

  if (modal !== 'destacada' || !destacada) return null;

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
        <div className="flex items-center gap-2">
          <Icono nombre="zap" className="h-4 w-4 text-amber-400" strokeWidth={2} />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            Novedad reciente
          </span>
        </div>
        <h2 className={`mt-1 text-lg font-black leading-snug ${tema.title}`}>
          {destacada.titulo}
        </h2>
        <p className={`text-[10px] mt-1 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          {fechaRelativa(destacada.fecha_publicacion)}
        </p>
      </div>

      {destacada.url_imagen && (
        <div className="w-full max-w-full h-52 sm:h-64 mt-4 overflow-hidden rounded-xl">
          <img
            src={obtenerUrlImagen(destacada.url_imagen)}
            alt={destacada.titulo}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <p className={`mt-4 text-sm leading-relaxed whitespace-pre-line break-words ${tema.subtitle}`}>
        {destacada.contenido}
      </p>

      <p className={`mt-4 text-[10px] uppercase tracking-wider ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
        Publicado el {fechaCorta(destacada.fecha_publicacion)}
      </p>
    </ModalBase>
  );
}
