import { Icono } from '../ui/Icono';
import { useTheme } from '../../contexts/ThemeContext';
import { Badge } from '../ui/Badge';

export function TablaClubes({
  clubes,
  onStatusChange,
  onEditar,
  onCrear,
}) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, selectCls, tema } = useTheme();
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className={`text-sm ${tema.subtitle}`}>{clubes.length} clubes registrados</p>
        <button
          onClick={onCrear}
          className="bg-amber-400 hover:bg-amber-500 text-[#0e162c] font-black text-xs uppercase tracking-widest rounded-xl px-5 py-2.5 transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-2"
        >
          <Icono nombre="plus" strokeWidth={2} className="h-4 w-4" />
          Agregar Nuevo Club
        </button>
      </div>

      <div className={`${tableBg} rounded-2xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Nombre</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Categoría</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Cupo</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Estatus</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clubes.map((c) => (
                <tr key={c.id_club} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{c.id_club}</td>
                  <td className={`px-5 py-4 font-medium ${tdTitle}`}>{c.nombre_club}</td>
                  <td className={`px-5 py-4 ${tdCls}`}>{c.categoria}</td>
                  <td className={`px-5 py-4 ${tdCls}`}>{c.cupo_maximo}</td>
                  <td className="px-5 py-4">
                    <Badge texto={c.estatus} color={
                      c.id_estatus_club === 1 ? 'emerald' : c.id_estatus_club === 2 ? 'amber' : 'red'
                    } size="md" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={c.id_estatus_club}
                        onChange={(e) => onStatusChange(c.id_club, Number(e.target.value))}
                        className={selectCls}
                      >
                        <option value={1}>Activo</option>
                        <option value={2}>Próximamente</option>
                        <option value={3}>Inactivo</option>
                      </select>
                      <button
                        onClick={() => onEditar(c)}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-1.5 rounded-lg border border-indigo-400/30 bg-indigo-400/10 cursor-pointer active:scale-95 flex items-center gap-1"
                        title="Editar club"
                      >
                        <Icono nombre="edit" strokeWidth={2} className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => onStatusChange(c.id_club, 3)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg border border-red-400/30 bg-red-400/10 cursor-pointer active:scale-95"
                      >
                        Dar de Baja
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
