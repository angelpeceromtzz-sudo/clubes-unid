/* Modal para crear o editar un club: formulario con nombre, categoría y cupo máximo. */
import { Icono } from '../../ui/Icono';
import { useTheme } from '../../../contexts/ThemeContext';
import { BotonAccion } from '../../ui/BotonAccion';
import { CampoTexto } from '../../ui/CampoTexto';
import { ModalBase } from '../../ui/ModalBase';
import { Spinner } from '../../ui/Spinner';
import { SubirImagen } from '../../ui/SubirImagen';
import { PARTICIPACION, NIVELES } from '../../../constants/clubes';

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
  onToggleNivel,
}) {
  const { modoOscuro, inputCls, labelCls, tema } = useTheme();
  if (!show) return null;

  const inputClasses = inputCls;

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-md" closeOnBackdrop={false}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          {editandoClub ? 'Editar Club' : 'Anexar Nuevo Club'}
        </h2>
        <button
          onClick={onClose}
          className={`transition-colors cursor-pointer ${modoOscuro ? 'text-white hover:text-amber-400' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        <CampoTexto label="Nombre del Club" name="nombre_club" value={formClub.nombre_club} onChange={onFormChange} placeholder="Ej: Equipo de Voleibol" required />

        <CampoTexto label="Descripción" name="descripcion" value={formClub.descripcion} onChange={onFormChange} placeholder="Describe el club y sus actividades..." type="textarea" required />

        <div>
          <label className={labelCls}>Categoría <span className="text-red-400">*</span></label>
          <select name="categoria" value={formClub.categoria} onChange={onFormChange} className={inputClasses}>
            <option value="" disabled>Selecciona una categoría</option>
            <option value="Deportes">Deportes</option>
            <option value="Cultura">Cultura</option>
            <option value="Tecnología">Tecnología</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Participación <span className="text-red-400">*</span></label>
          <select name="participacion" value={formClub.participacion} onChange={onFormChange} className={inputClasses} required>
            <option value="" disabled>Selecciona una modalidad</option>
            {PARTICIPACION.map((p) => (
              <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Niveles <span className="text-red-400">*</span></label>
          <div className="flex gap-1.5 flex-wrap">
            {NIVELES.map((n) => {
              const activo = formClub.niveles.includes(n.id_nivel);
              return (
                <button
                  key={n.id_nivel}
                  type="button"
                  onClick={() => onToggleNivel(n.id_nivel)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    activo
                      ? 'bg-amber-400 text-[#0e162c] border-amber-400'
                      : modoOscuro
                        ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-400/50 hover:text-amber-400'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-600'
                  }`}
                >
                  {n.etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        <CampoTexto label="Cupo Máximo" name="cupo_maximo" value={formClub.cupo_maximo} onChange={onFormChange} type="number" placeholder="Ej: 30" required />

        <SubirImagen label="Imagen del Club" urlImagen={formClub.imagen_portada} onUpload={onUploadImage} modoOscuro={modoOscuro} labelCls={labelCls} inputId="club-image-upload" obligatorio />

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
