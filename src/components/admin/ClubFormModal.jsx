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
}) {
  const { modoOscuro, inputCls, labelCls, tema } = useTheme();
  if (!show) return null;

  const inputClasses = inputCls;

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          {editandoClub ? 'Editar Club' : 'Anexar Nuevo Club'}
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors cursor-pointer"
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
