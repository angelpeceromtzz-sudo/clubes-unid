import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { nombreCategoriaEvento } from '../../constants/categoriasEvento';
import { estiloPublicacion } from '../../constants/publicaciones';
import { tipoFecha } from '../../constants/tiposFecha';
import { periodoEvento, periodoFechaAcademica } from '../../utils/calendario';
import { fechaCorta } from '../../utils/formato';
import { obtenerUrlImagen } from '../../utils/imagen';

export function TarjetaMural({ item, onDetalle, onEditar }) {
  const { tema, modoOscuro } = useTheme();
  const esFecha = item.origen === 'fecha';
  const propia = item.origen === 'mural';
  const tipo = esFecha ? tipoFecha(item.tipo_fecha) : null;
  const color = estiloPublicacion(esFecha ? 'promocion' : item.categoria, modoOscuro);
  const imagen = obtenerUrlImagen(item.url_imagen);
  const etiqueta = esFecha ? tipo.label : propia ? 'Mural' : `${color.label}${item.categoria === 'evento' ? ` · ${nombreCategoriaEvento(item.categoria_evento)}` : ''}`;
  return (
    <article className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 ${modoOscuro ? 'border-slate-700/70 bg-[#182238]' : 'border-white bg-[#fffdf7]'}`}>
      <div className={`h-1 ${item.destacada ? 'bg-amber-400' : esFecha ? 'bg-amber-600/60' : 'bg-blue-500/60'}`} />
      {imagen && <button type="button" onClick={() => onDetalle(item)} aria-label={`Ver cartel: ${item.titulo}`} className={`m-3 mb-0 flex h-44 items-center justify-center overflow-hidden rounded-xl cursor-pointer ${modoOscuro ? 'bg-slate-950/50' : 'bg-slate-100'}`}><img draggable={false} src={imagen} alt={`Cartel de ${item.titulo}`} loading="lazy" className="h-full w-full object-contain" /></button>}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${color.badge}`}><Icono nombre={tipo?.icono || (propia ? 'newspaper' : color.icono)} className="h-3 w-3" />{etiqueta}</span>{item.destacada && <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${modoOscuro ? 'text-amber-300' : 'text-amber-800'}`}><Icono nombre="star" className="h-3 w-3" />Destacado</span>}</div>
        <h3 className={`text-base font-bold leading-snug break-words ${tema.title}`}>{item.titulo}</h3>
        {(esFecha || item.fecha_evento) && <p className={`mt-2 text-[11px] font-semibold ${tema.subtitle}`}>{esFecha ? periodoFechaAcademica(item) : periodoEvento(item)}</p>}
        <p className={`mt-2 mb-5 line-clamp-3 break-words text-xs leading-relaxed ${tema.subtitle}`}>{esFecha ? item.nota || 'Consulta los detalles de esta fecha académica.' : item.subtitulo || item.contenido}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => onDetalle(item)} aria-label={`Leer publicación: ${item.titulo}`} className={`inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer hover:underline ${color.texto}`}>Ver detalles<Icono nombre="arrow-right" className="h-3.5 w-3.5" /></button>{(item.fecha_publicacion || item.fecha_creacion) && <time className={`text-[10px] ${tema.subtitle}`} dateTime={item.fecha_publicacion || item.fecha_creacion}>{fechaCorta(item.fecha_publicacion || item.fecha_creacion)}</time>}</div>
        {propia && item.enlace_url && <a href={item.enlace_url} target="_blank" rel="noopener noreferrer" className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4 ${color.texto}`}><Icono nombre="link" className="h-3.5 w-3.5" />{item.enlace_texto || 'Más información'}</a>}
        {onEditar && <button type="button" onClick={() => onEditar(item)} aria-label={`Editar ${item.titulo}`} className={`mt-4 flex w-fit items-center gap-1.5 text-xs font-semibold cursor-pointer ${tema.btnInactive}`}><Icono nombre="edit" className="h-3.5 w-3.5" />Editar publicación</button>}
      </div>
    </article>
  );
}
