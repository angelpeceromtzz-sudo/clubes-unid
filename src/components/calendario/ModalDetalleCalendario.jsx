import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialogoCalendario } from '../../hooks/useDialogoCalendario';
import { nombreCategoriaEvento } from '../../constants/categoriasEvento';
import { estiloPublicacion } from '../../constants/publicaciones';
import { periodoEvento } from '../../utils/calendario';
import { obtenerUrlImagen } from '../../utils/imagen';

export function ModalDetalleCalendario({ publicacion, onClose }) {
  const { tema, modoOscuro } = useTheme();
  const dialogoRef = useDialogoCalendario(onClose);
  const imagen = obtenerUrlImagen(publicacion.url_imagen);
  const color = { ...estiloPublicacion(publicacion.categoria, modoOscuro), ...(publicacion.origen === 'mural' ? { label: 'Mural', icono: 'newspaper' } : {}) };
  return (
    <ModalBase show onClose={onClose} maxWidth="max-w-2xl" panelClassName={`p-0 border ${color.borde} ${modoOscuro ? 'bg-[#0e162c]' : 'bg-white'}`}>
      <div ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-calendario">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0"><div className="flex items-center gap-2 mb-3"><span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-semibold ${color.badge}`}><Icono nombre={color.icono} className="h-3.5 w-3.5" />{color.label}{publicacion.categoria === 'evento' ? ` · ${nombreCategoriaEvento(publicacion.categoria_evento)}` : ''}</span></div><h2 id="titulo-detalle-calendario" className={`text-xl font-black break-words ${tema.title}`}>{publicacion.titulo}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className={`shrink-0 p-2 cursor-pointer ${tema.btnInactive}`}><Icono nombre="close" /></button>
        </div>
        {publicacion.fecha_evento && <p className={`text-sm font-semibold mb-2 ${tema.subtitle}`}>{periodoEvento(publicacion)}</p>}
        {publicacion.hora_evento && <p className={`flex items-center gap-1.5 text-xs mb-2 ${tema.subtitle}`}><Icono nombre="clock" className="h-3.5 w-3.5" />{String(publicacion.hora_evento).slice(0, 5)}</p>}
        {publicacion.lugar_evento && <p className={`flex items-start gap-1.5 text-xs mb-3 break-words ${tema.subtitle}`}><Icono nombre="map-pin" className="h-3.5 w-3.5 shrink-0" />{publicacion.lugar_evento}</p>}
        {imagen && <img src={imagen} alt={`Cartel de ${publicacion.titulo}`} className="w-full max-h-[65vh] object-contain rounded-xl my-4" />}
        {publicacion.origen === 'mural' && publicacion.subtitulo && <p className={`mb-3 text-sm font-semibold ${tema.title}`}>{publicacion.subtitulo}</p>}
        {publicacion.contenido !== publicacion.titulo && <p className={`text-sm leading-relaxed whitespace-pre-line break-words ${tema.subtitle}`}>{publicacion.contenido}</p>}
        {publicacion.origen === 'mural' && publicacion.enlace_url && <a href={publicacion.enlace_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950"><Icono nombre="link" className="h-4 w-4" />{publicacion.enlace_texto || 'Más información'}</a>}
      </div>
    </ModalBase>
  );
}
