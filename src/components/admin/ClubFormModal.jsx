import { Icono } from '../ui/Icono';

export function ModalFormularioClub({
  show,
  editandoClub,
  formClub,
  enviando,
  modalError,
  isDark,
  cardCls,
  inputCls,
  labelCls,
  tema,
  onClose,
  onSave,
  onFormChange,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className={`${cardCls} rounded-2xl w-full max-w-md p-8 shadow-2xl`}>
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
          <div>
            <label className={labelCls}>Nombre del Club <span className="text-red-400">*</span></label>
            <input type="text" name="nombre_club" value={formClub.nombre_club} onChange={onFormChange} placeholder="Ej: Equipo de Voleibol" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Categoría <span className="text-red-400">*</span></label>
            <select name="categoria" value={formClub.categoria} onChange={onFormChange} className={inputCls}>
              <option value="" disabled>Selecciona una categoría</option>
              <option value="Deportes">Deportes</option>
              <option value="Cultura">Cultura</option>
              <option value="Tecnología">Tecnología</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Cupo Máximo <span className="text-red-400">*</span></label>
            <input type="number" name="cupo_maximo" value={formClub.cupo_maximo} onChange={onFormChange} min="1" placeholder="Ej: 30" className={inputCls} />
          </div>

          {modalError && <p className="text-red-400 text-xs font-medium">{modalError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                isDark ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white' : 'bg-slate-200 text-slate-600 border border-slate-300'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl py-2.5 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              {enviando ? (
                <>
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-[#0e162c] border-t-transparent rounded-full" />
                  {editandoClub ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                editandoClub ? 'Guardar Cambios' : 'Crear Club'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
