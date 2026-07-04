/* Modal para crear o editar un club: formulario con nombre, categoría y cupo máximo. */
import { useRef, useState } from 'react';
import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { BotonAccion } from '../ui/BotonAccion';
import { CampoTexto } from '../ui/CampoTexto';
import { ModalBase } from '../ui/ModalBase';
import { Spinner } from '../ui/Spinner';

export function ModalFormularioClub({
  show,
  editandoClub,
  formClub,
  enviando,
  modalError,
  onClose,
  onSave,
  onFormChange,
  onUploadImage,
}) {
  const { modoOscuro, inputCls, labelCls, tema } = useTheme();
  const fileInputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  if (!show) return null;

  const inputClasses = inputCls;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadImage) return;
    setSubiendo(true);
    try {
      await onUploadImage(file);
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          {editandoClub ? 'Editar Club' : 'Anexar Nuevo Club'}
        </h2>
        <button
          onClick={onClose}
          className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        <CampoTexto label="Nombre del Club" name="nombre_club" value={formClub.nombre_club} onChange={onFormChange} placeholder="Ej: Equipo de Voleibol" required />

        <div>
          <label className={labelCls}>Categoría <span className="text-red-400">*</span></label>
          <select name="categoria" value={formClub.categoria} onChange={onFormChange} className={inputClasses}>
            <option value="" disabled>Selecciona una categoría</option>
            <option value="Deportes">Deportes</option>
            <option value="Cultura">Cultura</option>
            <option value="Tecnología">Tecnología</option>
          </select>
        </div>

        <CampoTexto label="Cupo Máximo" name="cupo_maximo" value={formClub.cupo_maximo} onChange={onFormChange} type="number" placeholder="Ej: 30" required />

        <CampoTexto label="URL de Imagen (opcional)" name="imagen_portada" value={formClub.imagen_portada} onChange={onFormChange} placeholder="https://ejemplo.com/imagen.jpg" />

        <div>
          <label className={labelCls}>O subir imagen</label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
              id="club-image-upload"
            />
            <label
              htmlFor="club-image-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-colors ${modoOscuro ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              <Icono nombre="upload" className="h-4 w-4" strokeWidth={2} />
              Seleccionar archivo
            </label>
            {subiendo && (
              <Spinner size="sm" color="border-amber-400" className="!py-0" />
            )}
          </div>
        </div>

        {formClub.imagen_portada && (
          <div className="relative w-full h-32 rounded-lg overflow-hidden">
            <img
              src={formClub.imagen_portada}
              alt="Vista previa"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Vista previa del club */}
        {formClub.nombre_club.trim() && (
          <div className={`rounded-xl border p-4 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-[10px] uppercase tracking-wider font-bold mb-2 ${tema.subtitle}`}>Vista previa</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Icono nombre="star" className="h-5 w-5 text-amber-400" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${tema.title}`}>{formClub.nombre_club}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${modoOscuro ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
                    {formClub.categoria || 'Categoría'}
                  </span>
                  {formClub.cupo_maximo && (
                    <span className={`text-[10px] ${tema.subtitle}`}>Cupo: {formClub.cupo_maximo}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {modalError && <p className="text-red-400 text-xs font-medium">{modalError}</p>}

        <div className="flex gap-3 pt-2">
          <BotonAccion onClick={onClose} variant="outline" size="md" className="flex-1">
            Cancelar
          </BotonAccion>
          <BotonAccion type="submit" disabled={enviando} variant="primary" size="md" className="flex-1">
            {enviando ? (
              <>
                <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                {editandoClub ? 'Guardando...' : 'Creando...'}
              </>
            ) : (
              editandoClub ? 'Guardar Cambios' : 'Crear Club'
            )}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}
