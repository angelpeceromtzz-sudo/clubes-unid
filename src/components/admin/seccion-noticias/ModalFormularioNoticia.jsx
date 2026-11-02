import { ModalBase } from '../../ui/ModalBase';
import { Icono } from '../../ui/Icono';
import { CampoTexto } from '../../ui/CampoTexto';
import { BotonAccion } from '../../ui/BotonAccion';
import { Spinner } from '../../ui/Spinner';
import { SubirImagen } from '../../ui/SubirImagen';
import { CATEGORIAS_EVENTO } from '../../../constants/categoriasEvento';
import { OpcionMural } from '../../noticias/OpcionMural';
import { fechaHoyCampus } from '../../../utils/fechas';
import { fechaLegible } from '../../../utils/calendario';
import { fechaMaximaCalendario, limitesFechasCalendario, validarFechasEvento } from '../../../utils/validacionCalendario';

const CATEGORIAS_NOTICIA = [
  { value: 'promocion', label: 'Promoción' },
  { value: 'informativo', label: 'Informativo' },
];

export function ModalFormularioNoticia({ show, editando, form, enviando, subiendoImagen, errorModal, modoOscuro, tema, labelCls, esAprobador = false, onClose, onGuardar, onFormChange, onSubirImagen, tipoSeccion = 'noticia' }) {
  const hoy = fechaHoyCampus();
  const fechaAnterior = editando?.fecha_evento ? String(editando.fecha_evento).slice(0, 10) : '';
  const finAnterior = editando?.fecha_fin_evento ? String(editando.fecha_fin_evento).slice(0, 10) : '';
  const limitesInicio = limitesFechasCalendario(fechaAnterior, hoy);
  const limitesFin = limitesFechasCalendario(finAnterior, hoy);
  const erroresFechas = validarFechasEvento(form, { hoy, original: editando ? { fecha_evento: fechaAnterior, fecha_fin_evento: finAnterior } : undefined });
  // PBI-17: publicar directo es exclusivo de rectoría, y sólo al crear; una
  // noticia ya existente cambia de estado desde los botones de revisión.
  const puedePublicarDirecto = esAprobador && !editando;
  const publicaDirecta = puedePublicarDirecto && form.publicada;

  return (
    <ModalBase show={show} onClose={onClose} closeOnBackdrop={!enviando && !subiendoImagen} maxWidth="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          {editando ? (tipoSeccion === 'evento' ? 'Editar Evento' : 'Editar Noticia') : (tipoSeccion === 'evento' ? 'Nuevo Evento' : 'Nueva Noticia')}
        </h2>
        <button onClick={onClose} disabled={enviando || subiendoImagen} aria-label="Cerrar formulario de publicación"
          className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={onGuardar} noValidate={tipoSeccion === 'evento'} className="space-y-4">
        <CampoTexto label="Título" name="titulo" value={form.titulo} onChange={onFormChange} placeholder="Ej: Convocatoria a integración" required maxLength={200} />
        <CampoTexto label="Subtítulo" name="subtitulo" value={form.subtitulo} onChange={onFormChange} placeholder="Frase breve que resume la noticia (opcional)" maxLength={300} />
        <CampoTexto label="Contenido" name="contenido" type="textarea" value={form.contenido} onChange={onFormChange} placeholder="Escribe aquí el detalle de la novedad..." required />

        <SubirImagen label="Imagen" urlImagen={form.url_imagen} onUpload={onSubirImagen} modoOscuro={modoOscuro} labelCls={labelCls} inputId="noticia-image-upload" editando={editando} />

        {tipoSeccion === 'evento' && (
          <div className="space-y-4">
            <CampoTexto label="Fecha del evento" name="fecha_evento" type="date" value={form.fecha_evento || ''} onChange={onFormChange} min={limitesInicio.min} max={limitesInicio.max} error={errorModal ? erroresFechas.fecha_evento : undefined} required />
            <CampoTexto label="Fecha de fin (opcional)" name="fecha_fin_evento" type="date" value={form.fecha_fin_evento || ''} onChange={onFormChange} min={form.fecha_evento > limitesFin.min ? form.fecha_evento : limitesFin.min} max={limitesFin.max} error={errorModal ? erroresFechas.fecha_fin_evento : undefined} />
            <p className={`-mt-2 text-[11px] ${tema.subtitle}`}>
              {editando ? 'Puedes conservar las fechas originales. Para reprogramar, elige' : 'Elige'} desde hoy hasta el {fechaLegible(fechaMaximaCalendario(hoy), true)}.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <CampoTexto label="Hora" name="hora_evento" type="time" value={form.hora_evento || ''} onChange={onFormChange} />
              <CampoTexto label="Lugar" name="lugar_evento" value={form.lugar_evento || ''} onChange={onFormChange} maxLength={200} placeholder="Ej: Auditorio del campus" />
            </div>
            <div>
              <label htmlFor="categoria-evento-noticia" className={labelCls}>Categoría del evento</label>
              <div className="relative">
                <span className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${tema.subtitle}`}><Icono nombre={CATEGORIAS_EVENTO.find((cat) => cat.value === form.categoria_evento)?.icono || 'users'} className="h-4 w-4" /></span>
                <select id="categoria-evento-noticia" name="categoria_evento" value={form.categoria_evento} onChange={onFormChange} className={`w-full rounded-xl border pl-10 pr-3 py-2.5 text-sm ${modoOscuro ? 'bg-[#18223f] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-700'}`}>
                  {CATEGORIAS_EVENTO.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {tipoSeccion !== 'evento' && <div>
          <span className={labelCls}>Categoría</span>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS_NOTICIA.map((cat) => {
              const activa = form.categoria === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  name="categoria"
                  value={cat.value}
                  onClick={onFormChange}
                  className={`rounded-xl border px-2 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                    activa
                      ? 'border-amber-400 bg-amber-400/15 text-amber-400 shadow-sm'
                      : modoOscuro
                        ? 'border-slate-700 bg-[#18223f] text-slate-400 hover:text-slate-200'
                        : 'border-slate-300 bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>}

        <div className="flex flex-col sm:flex-row gap-3">
          {puedePublicarDirecto && (
            <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
              <input type="checkbox" name="publicada" checked={form.publicada} onChange={onFormChange} className="w-4 h-4 accent-amber-400 cursor-pointer" />
              Publicar directo
            </label>
          )}
          <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <input type="checkbox" name="destacada" checked={form.destacada} onChange={onFormChange} className="w-4 h-4 accent-amber-400 cursor-pointer" />
            Destacada
          </label>
        </div>
        <OpcionMural checked={!!form.mostrar_en_mural} onChange={onFormChange} disabled={enviando} />

        {!publicaDirecta && !editando && (
          <p className={`text-[11px] ${tema.subtitle}`}>
            Se guardará como borrador. Para que aparezca en el periódico mural, envíala a revisión y rectoría la aprobará.
          </p>
        )}

        {errorModal && <p className="text-red-400 text-xs font-medium">{errorModal}</p>}

        <div className="flex gap-3 pt-2">
          <BotonAccion onClick={onClose} disabled={enviando || subiendoImagen} variant="outline" size="md" className="flex-1">Cancelar</BotonAccion>
          <BotonAccion type="submit" disabled={enviando || subiendoImagen} variant="primary" size="md" className="flex-1">
            {enviando ? (
              <>
                <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                Guardando...
              </>
            ) : (
              subiendoImagen ? 'Subiendo imagen…' : editando
                ? 'Guardar Cambios'
                : publicaDirecta
                  ? (tipoSeccion === 'evento' ? 'Publicar Evento' : 'Publicar')
                  : (tipoSeccion === 'evento' ? 'Guardar Evento' : 'Guardar Borrador')
            )}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}
