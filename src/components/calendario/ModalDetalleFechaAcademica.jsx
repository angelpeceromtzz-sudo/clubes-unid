import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { SimboloFecha } from './SimboloFecha';
import { useTheme } from '../../contexts/ThemeContext';
import { useDialogoCalendario } from '../../hooks/useDialogoCalendario';
import { tipoFecha } from '../../constants/tiposFecha';
import { periodoFechaAcademica } from '../../utils/calendario';
import { obtenerUrlImagen } from '../../utils/imagen';

export function ModalDetalleFechaAcademica({ fecha, onClose }) {
  const { tema, modoOscuro } = useTheme();
  const dialogoRef = useDialogoCalendario(onClose);
  const imagen = obtenerUrlImagen(fecha.url_imagen);
  return (
    <ModalBase show onClose={onClose} maxWidth="max-w-2xl" panelClassName={`border ${modoOscuro ? 'border-slate-700 bg-[#0e162c]' : 'border-slate-200 bg-white'}`}>
      <div ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby="titulo-fecha-academica">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0"><div className="flex items-center gap-2 mb-3"><SimboloFecha tipo={fecha.tipo_fecha} /><span className={`text-xs font-semibold ${tema.subtitle}`}>{tipoFecha(fecha.tipo_fecha).label}</span></div><h2 id="titulo-fecha-academica" className={`text-xl font-black break-words ${tema.title}`}>{fecha.titulo}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className={`shrink-0 p-2 cursor-pointer ${tema.btnInactive}`}><Icono nombre="close" /></button>
        </div>
        <p className={`text-sm font-semibold mb-3 ${tema.subtitle}`}>{periodoFechaAcademica(fecha)}</p>
        {imagen && <img src={imagen} alt={`Información de ${fecha.titulo}`} className="w-full max-h-[65vh] object-contain rounded-xl my-4" />}
        {fecha.nota && <p className={`text-sm leading-relaxed whitespace-pre-line break-words ${tema.subtitle}`}>{fecha.nota}</p>}
      </div>
    </ModalBase>
  );
}
