/* Tarjeta de noticia de la página /noticias: muestra el contenido completo cuando cabe
   en 50 palabras; si es más largo, recorta el texto y ofrece un botón "Ver más" que
   solo expande la noticia al pulsarlo. */
import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { obtenerUrlImagen } from '../../utils/imagen';
import { contarPalabras, fechaCorta, fechaEventoCorta, fechaRelativa, recortarPalabras } from '../../utils/formato';
import { nombreCategoriaEvento } from '../../constants/categoriasEvento';
import { fechaHoyCampus } from '../../utils/fechas';

const LIMITE_PALABRAS = 50;

export function TarjetaNoticia({ noticia, interesado = false, interesReciente = false, totalInteresados = 0, interesProcesando = false, onToggleInteres }) {
  const { tema, modoOscuro } = useTheme();
  const [expandida, setExpandida] = useState(false);

  const tieneMas = contarPalabras(noticia.contenido) > LIMITE_PALABRAS;
  const contenido = tieneMas && !expandida
    ? recortarPalabras(noticia.contenido, LIMITE_PALABRAS)
    : noticia.contenido;
  const esEvento = noticia.categoria === 'evento';
  const finalizado = esEvento && noticia.fecha_evento && String(noticia.fecha_evento).slice(0, 10) < fechaHoyCampus();
  const cantidadInteresados = Number(totalInteresados) || 0;

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
          {esEvento && (
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${modoOscuro
              ? 'border-indigo-400/30 bg-indigo-400/10 text-indigo-300'
              : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
              {nombreCategoriaEvento(noticia.categoria_evento)}
            </span>
          )}
          {finalizado && <span className={`text-[10px] font-bold uppercase tracking-wider ${tema.subtitle}`}>Finalizado</span>}
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

        {esEvento && (
          <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold ${modoOscuro ? 'text-indigo-300' : 'text-indigo-600'}`}>
            {noticia.fecha_evento && <span>📅 {fechaEventoCorta(noticia.fecha_evento)}</span>}
            {noticia.hora_evento && <span>🕒 {String(noticia.hora_evento).slice(0, 5)}</span>}
            {noticia.lugar_evento && <span>📍 {noticia.lugar_evento}</span>}
          </div>
        )}

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

        {esEvento && onToggleInteres && (
          <div className={`mt-5 flex flex-wrap items-center gap-3 border-t pt-4 ${modoOscuro ? 'border-slate-700/50' : 'border-slate-100'}`}>
            {interesado ? (
              <button type="button" disabled
                aria-label={`Interés confirmado en ${noticia.titulo}`}
                title="Tu interés quedó guardado en tu cuenta"
                className={`boton-interes-confirmado${modoOscuro ? '' : ' boton-interes-confirmado--claro'}${interesReciente ? ' boton-interes-confirmado--reciente' : ''}`}
              >
                <span className="interes-confirmado-marca">
                  <Icono nombre="check" className="h-4 w-4" strokeWidth={3} />
                </span>
                Interés confirmado
              </button>
            ) : (
              <button type="button" onClick={onToggleInteres} disabled={interesProcesando || finalizado}
                aria-label={`Mostrar interés en ${noticia.titulo}`}
                className={finalizado
                  ? `inline-flex cursor-not-allowed items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${modoOscuro ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`
                  : 'boton-interes-cta'}
              >
                {finalizado ? <Icono nombre="clock" className="h-4 w-4" strokeWidth={2.3} /> : (
                  <span className="interes-cta-estrella" aria-hidden="true">
                    <Icono nombre="star" className="h-4 w-4" strokeWidth={2.3} />
                  </span>
                )}
                <span>{finalizado ? 'Evento finalizado' : 'Mostrar interés'}</span>
              </button>
            )}
            {cantidadInteresados > 10 && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${modoOscuro ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                <Icono nombre="zap" className="h-3.5 w-3.5" strokeWidth={2} />
                En tendencia · {cantidadInteresados} interesados
              </span>
            )}
          </div>
        )}

        <p className={`mt-4 text-[10px] uppercase tracking-wider ${modoOscuro ? 'text-slate-600' : 'text-slate-400'}`}>
          Publicado el {fechaCorta(noticia.fecha_publicacion)}
        </p>
      </div>
    </article>
  );
}
