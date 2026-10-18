import { ModalBase } from '../../ui/ModalBase';
import { BotonCerrar } from '../../ui/BotonCerrar';
import { CampoTexto } from '../../ui/CampoTexto';
import { BotonAccion } from '../../ui/BotonAccion';
import { Spinner } from '../../ui/Spinner';
import { SubirImagen } from '../../ui/SubirImagen';

export function ModalFormularioDiapositiva({ show, editando, form, enviando, errorModal, modoOscuro, tema, labelCls, inputCls, posicionesDisponibles, onClose, onGuardar, onFormChange, onSubirImagen, onSubirImagenMovil, onQuitarImagenMovil }) {

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          {editando ? 'Editar Banner' : 'Nuevo Banner'}
        </h2>
        <BotonCerrar onClick={onClose} />
      </div>

      <form onSubmit={onGuardar} className="space-y-4">
        <CampoTexto label="Título" name="titulo" value={form.titulo} onChange={onFormChange} placeholder="Ej: Bienvenidos a la manada" required />
        <CampoTexto label="Subtítulo" name="subtitulo" value={form.subtitulo} onChange={onFormChange} placeholder="Texto secundario (opcional)" />

        <div>
          <label className={labelCls}>Orden</label>
          <select name="orden" value={form.orden} onChange={onFormChange} className={inputCls}>
            {posicionesDisponibles.map((pos) => (
              <option key={pos} value={pos}>Posición {pos}</option>
            ))}
          </select>
        </div>

        <SubirImagen label="Imagen" urlImagen={form.url_imagen} onUpload={onSubirImagen} modoOscuro={modoOscuro} labelCls={labelCls} inputId="hero-image-upload" editando={editando} obligatorio />

        <SubirImagen
          label="Imagen para móvil (opcional)"
          urlImagen={form.url_imagen_movil}
          onUpload={onSubirImagenMovil}
          onRemove={onQuitarImagenMovil}
          modoOscuro={modoOscuro}
          labelCls={labelCls}
          inputId="hero-mobile-image-upload"
          editando={editando}
          ayuda="Si no se sube, en móvil se usa la imagen de escritorio. Recomendado: retrato compuesto para pantallas pequeñas."
        />

        {errorModal && <p className="text-red-400 text-xs font-medium">{errorModal}</p>}

        <div className="flex gap-3 pt-2">
          <BotonAccion onClick={onClose} variant="outline" size="md" className="flex-1">Cancelar</BotonAccion>
          <BotonAccion type="submit" disabled={enviando} variant="primary" size="md" className="flex-1">
            {enviando ? (
              <>
                <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                {editando ? 'Guardando...' : 'Creando...'}
              </>
            ) : (
              editando ? 'Guardar Cambios' : 'Crear Banner'
            )}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}
