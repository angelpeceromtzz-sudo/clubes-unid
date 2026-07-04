import { useTheme } from '../../contexts/ThemeContext';
import { Icono } from '../ui/Icono';
import { BotonAccion } from '../ui/BotonAccion';
import { ModalBase } from '../ui/ModalBase';
import { Spinner } from '../ui/Spinner';

export function ModalFormularioUsuario({
  show, formUsuario, enviando, modalError,
  onClose, onSave, onFormChange,
}) {
  const { modoOscuro, inputCls, labelCls, tema } = useTheme();
  if (!show) return null;

  return (
    <ModalBase show={show} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          Crear Nuevo Usuario
        </h2>
        <button
          onClick={onClose}
          className={`transition-colors cursor-pointer ${modoOscuro ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Icono nombre="close" strokeWidth={2} className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={onSave} className="space-y-4">
        <div>
          <label className={labelCls}>Nombre Completo <span className="text-red-400">*</span></label>
          <input
            name="nombre_completo"
            value={formUsuario.nombre_completo}
            onChange={onFormChange}
            placeholder="Ej: Juan Pérez"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Correo Institucional <span className="text-red-400">*</span></label>
          <input
            name="correo_institucional"
            type="email"
            value={formUsuario.correo_institucional}
            onChange={onFormChange}
            placeholder="ejemplo@unid.edu.mx"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Contraseña <span className="text-red-400">*</span></label>
          <input
            name="contrasena"
            type="password"
            value={formUsuario.contrasena}
            onChange={onFormChange}
            placeholder="Contraseña temporal"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Rol <span className="text-red-400">*</span></label>
          <select name="id_rol" value={formUsuario.id_rol} onChange={onFormChange} className={inputCls}>
            <option value={1}>Alumno</option>
            <option value={2}>Presidente</option>
            <option value={4}>Rectoría</option>
          </select>
        </div>

        {modalError && <p className="text-red-400 text-xs font-medium">{modalError}</p>}

        <div className="flex gap-3 pt-2">
          <BotonAccion onClick={onClose} variant="outline" size="md" className="flex-1">
            Cancelar
          </BotonAccion>
          <BotonAccion type="submit" disabled={enviando} variant="primary" size="md" className="flex-1">
            {enviando ? (
              <>
                <Spinner size="sm" color="border-[#0e162c]" className="!py-0" />
                Creando...
              </>
            ) : 'Crear Usuario'}
          </BotonAccion>
        </div>
      </form>
    </ModalBase>
  );
}