import { ModalBase } from '../../ui/ModalBase';
import { Icono } from '../../ui/Icono';
import { CampoTexto } from '../../ui/CampoTexto';
import { BotonAccion } from '../../ui/BotonAccion';
import { Spinner } from '../../ui/Spinner';
import { SubirImagen } from '../../ui/SubirImagen';

export function ModalFormularioNoticia({ show, editando, form, enviando, errorModal, modoOscuro, tema, labelCls, onClose, onGuardar, onFormChange, onSubirImagen }) {

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          {editando ? 'Editar Noticia' : 'Nueva Noticia'}
        </h2>
        <button onClick={onClose}
          className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={onGuardar} className="space-y-4">
        <label className={`block ${labelCls}`}>
          <span className="block mb-1">Tipo de publicación</span>
          <select name="tipo" value={form.tipo || 'noticia'} onChange={onFormChange} className={`w-full rounded-xl border px-3 py-2.5 text-sm ${modoOscuro ? 'bg-[#0e162c] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
            <option value="noticia">Noticia</option>
            <option value="evento">Evento</option>
          </select>
        </label>
        <CampoTexto label="Título" name="titulo" value={form.titulo} onChange={onFormChange} placeholder="Ej: Convocatoria a integración" required maxLength={200} />
        <CampoTexto label="Contenido" name="contenido" type="textarea" value={form.contenido} onChange={onFormChange} placeholder="Escribe aquí el detalle de la novedad..." required />

        {form.tipo === 'evento' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CampoTexto label="Fecha del evento" name="fecha_evento" type="date" value={form.fecha_evento || ''} onChange={onFormChange} required />
            <CampoTexto label="Hora" name="hora_evento" type="time" value={form.hora_evento || ''} onChange={onFormChange} />
            <div className="sm:col-span-2">
              <CampoTexto label="Lugar" name="lugar_evento" value={form.lugar_evento || ''} onChange={onFormChange} placeholder="Ej: Auditorio del campus" />
            </div>
          </div>
        )}

        <SubirImagen label="Imagen" urlImagen={form.url_imagen} onUpload={onSubirImagen} modoOscuro={modoOscuro} labelCls={labelCls} inputId="noticia-image-upload" editando={editando} />

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
        <p className={`-mt-2 text-xs ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          “Destacada” resalta esta publicación en el listado. Para que sea visible al público, también debe estar marcada como “Publicada”.
        </p>

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
              editando ? 'Guardar Cambios' : 'Publicar Noticia'
            )}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}
