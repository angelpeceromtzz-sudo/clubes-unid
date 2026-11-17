/* Modal de rechazo (sólo rectoría, PBI-17): pide un motivo OPCIONAL y lo manda
   al endpoint `POST /noticias/:id/rechazar`. El motivo le llega al autor en la
   alerta de su listado para que sepa qué corregir. */
import { ModalBase } from '../../ui/ModalBase';
import { Icono } from '../../ui/Icono';
import { CampoTexto } from '../../ui/CampoTexto';
import { BotonAccion } from '../../ui/BotonAccion';
import { Spinner } from '../../ui/Spinner';
import { ETIQUETAS_ESTADO } from '../../../constants/noticias';

const MOTIVO_MAX = 200;

export function ModalRechazoNoticia({ show, noticia, motivo, enviando, error, modoOscuro, tema, onMotivoChange, onConfirmar, onCerrar }) {
  if (!noticia) return null;

  return (
    <ModalBase show={show} onClose={onCerrar} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>Rechazar noticia</h2>
        <button
          onClick={onCerrar}
          className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
          aria-label="Cerrar"
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>

      <div className={`rounded-xl border p-4 mb-4 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
        <p className={`text-sm font-bold ${tema.title}`}>{noticia.titulo}</p>
        <p className={`text-xs mt-1 ${tema.subtitle}`}>
          Volverá al estado «{ETIQUETAS_ESTADO.draft}» con el motivo que escribas y su autor podrá corregirla.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onConfirmar(); }} className="space-y-4">
        <CampoTexto
          label="Motivo del rechazo (opcional)"
          name="motivo"
          type="textarea"
          value={motivo}
          onChange={(e) => onMotivoChange(e.target.value)}
          placeholder="Ej: Falta la fecha del evento y la imagen no corresponde a la convocatoria."
          maxLength={MOTIVO_MAX}
        />
        <p className={`-mt-2 text-[11px] ${tema.subtitle}`}>
          Ayuda al autor a saber qué corregir. Quedará visible en su listado.
        </p>

        {error && <p className="text-red-400 text-xs font-medium">{error}</p>}

        <div className="flex gap-3 pt-2">
          <BotonAccion onClick={onCerrar} variant="outline" size="md" className="flex-1">Cancelar</BotonAccion>
          <BotonAccion type="submit" disabled={enviando} variant="danger" size="md" className="flex-1">
            {enviando ? (
              <>
                <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                Rechazando...
              </>
            ) : (
              'Rechazar Noticia'
            )}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}
