import { ModalBase } from '../../ui/ModalBase';
import { Icono } from '../../ui/Icono';
import { CampoTexto } from '../../ui/CampoTexto';
import { BotonAccion } from '../../ui/BotonAccion';
import { Spinner } from '../../ui/Spinner';
import { SubirImagen } from '../../ui/SubirImagen';
import { CATEGORIAS_EVENTO } from '../../../constants/categoriasEvento';
import { fechaHoyCampus } from '../../../utils/fechas';

const CATEGORIAS_NOTICIA = [
  { value: 'promocion', label: 'Promoción' },
  { value: 'informativo', label: 'Informativo' },
];

export function ModalFormularioNoticia({ show, editando, form, enviando, errorModal, modoOscuro, tema, labelCls, onClose, onGuardar, onFormChange, onSubirImagen, tipoSeccion = 'noticia' }) {
  const hoy = fechaHoyCampus();
  const fechaAnterior = editando?.fecha_evento ? String(editando.fecha_evento).slice(0, 10) : '';
  const fechaMinima = fechaAnterior && fechaAnterior < hoy ? fechaAnterior : hoy;

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          {editando ? (tipoSeccion === 'evento' ? 'Editar Evento' : 'Editar Noticia') : (tipoSeccion === 'evento' ? 'Nuevo Evento' : 'Nueva Noticia')}
        </h2>
        <button onClick={onClose}
          className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={onGuardar} className="space-y-4">
        <CampoTexto label="Título" name="titulo" value={form.titulo} onChange={onFormChange} placeholder="Ej: Convocatoria a integración" required maxLength={200} />
        <CampoTexto label="Contenido" name="contenido" type="textarea" value={form.contenido} onChange={onFormChange} placeholder="Escribe aquí el detalle de la novedad..." required />

        <SubirImagen label="Imagen" urlImagen={form.url_imagen} onUpload={onSubirImagen} modoOscuro={modoOscuro} labelCls={labelCls} inputId="noticia-image-upload" editando={editando} />

        {tipoSeccion === 'evento' && (
          <div className="space-y-4">
            <CampoTexto label="Fecha del evento" name="fecha_evento" type="date" value={form.fecha_evento || ''} onChange={onFormChange} min={fechaMinima} required />
            <p className={`-mt-2 text-[11px] ${tema.subtitle}`}>
              {fechaAnterior && fechaAnterior < hoy
                ? 'Puedes conservar la fecha original. Si la cambias, elige hoy o una fecha futura.'
                : 'Selecciona hoy o una fecha futura.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <CampoTexto label="Hora" name="hora_evento" type="time" value={form.hora_evento || ''} onChange={onFormChange} />
              <CampoTexto label="Lugar" name="lugar_evento" value={form.lugar_evento || ''} onChange={onFormChange} maxLength={200} placeholder="Ej: Auditorio del campus" />
            </div>
            <div>
              <span className={labelCls}>Categoría del evento</span>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIAS_EVENTO.map((cat) => {
                  const activa = form.categoria_evento === cat.value;
                  return (
                    <button key={cat.value} type="button" name="categoria_evento" value={cat.value} onClick={onFormChange}
                      aria-pressed={activa}
                      className={`rounded-xl border px-2 py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                        activa ? 'border-amber-400 bg-amber-400/15 text-amber-400 shadow-sm'
                          : modoOscuro ? 'border-slate-700 bg-[#18223f] text-slate-400 hover:text-slate-200'
                            : 'border-slate-300 bg-slate-100 text-slate-500 hover:text-slate-800'
                      }`}
                    >{cat.label}</button>
                  );
                })}
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
          <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <input type="checkbox" name="publicada" checked={form.publicada} onChange={onFormChange} className="w-4 h-4 accent-amber-400 cursor-pointer" />
            Publicada
          </label>
          <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer ${modoOscuro ? 'text-slate-300' : 'text-slate-600'}`}>
            <input type="checkbox" name="destacada" checked={form.destacada} onChange={onFormChange} className="w-4 h-4 accent-amber-400 cursor-pointer" />
            Destacada
          </label>
        </div>

        {errorModal && <p className="text-red-400 text-xs font-medium">{errorModal}</p>}

        <div className="flex gap-3 pt-2">
          <BotonAccion onClick={onClose} variant="outline" size="md" className="flex-1">Cancelar</BotonAccion>
          <BotonAccion type="submit" disabled={enviando} variant="primary" size="md" className="flex-1">
            {enviando ? (
              <>
                <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                {editando ? 'Guardando...' : 'Publicando...'}
              </>
            ) : (
              editando ? 'Guardar Cambios' : (tipoSeccion === 'evento' ? 'Guardar Evento' : 'Publicar Noticia')
            )}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}
