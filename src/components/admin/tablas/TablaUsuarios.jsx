/* Tabla de gestión de usuarios: filtro, cambio de rol, asignación/desasignación de club. */
import { useState } from 'react';
import { Icono } from '../../ui/Icono';
import { useTheme } from '../../../contexts/ThemeContext';
import { Badge } from '../../ui/Badge';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { AsignacionClubUsuario } from './tabla-usuarios/AsignacionClubUsuario';
import { AccionesUsuario } from './tabla-usuarios/AccionesUsuario';

export function TablaUsuarios({
  usuarios,
  busqueda,
  currentUser,
  clubesActivosList,
  asignando,
  onRoleChange,
  onRemoveFromClub,
  onAsignarClub,
  onAsignarAlumnoClub,
  onEliminarUsuario,
  onAdminAction,
}) {
  const { modoOscuro, tableBg, thCls, tdCls, tdTitle, selectCls } = useTheme();
  const [confirmPendiente, setConfirmPendiente] = useState(null);
  const q = busqueda.toLowerCase().trim();
  const filtrados = q
    ? usuarios.filter(
        (u) =>
          String(u.id_usuario).includes(q) ||
          u.nombre_completo.toLowerCase().includes(q) ||
          u.correo_institucional.toLowerCase().includes(q)
      )
    : usuarios;

  if (q && filtrados.length === 0) {
    return (
      <div className={`${tableBg} rounded-2xl py-16 px-4 text-center`}>
        <Icono nombre="search" strokeWidth={2} className={`h-10 w-10 mx-auto mb-3 ${modoOscuro ? 'text-slate-600' : 'text-slate-300'}`} />
        <p className={`text-sm font-medium ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          No se encontraron usuarios que coincidan con la búsqueda.
        </p>
      </div>
    );
  }

  function confirmarAsignacion() {
    if (!confirmPendiente) return;
    const { userId, clubId, tipo } = confirmPendiente;
    setConfirmPendiente(null);
    if (tipo === 'presidente') {
      onAsignarClub(userId, clubId);
    } else {
      onAsignarAlumnoClub(userId, clubId);
    }
  }

  return (
    <>
      {/* Desktop - tabla */}
      <div className={`${tableBg} rounded-2xl overflow-hidden hidden md:block`}>
        <div className="overflow-x-auto">
          <table className="min-w-max w-full text-sm">
            <thead>
              <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <th className={`px-5 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
                <th className={`px-5 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls} `}>Nombre</th>
                <th className={`px-5 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Correo</th>
                <th className={`px-5 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Rol</th>
                <th className={`px-5 py-4  text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Club</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id_usuario} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className={`px-5 py-4  font-mono text-xs ${tdCls}`}>{u.id_usuario}</td>
                  <td className={`px-5 py-4  font-medium ${tdTitle} `}>{u.nombre_completo}</td>
                  <td className={`px-5 py-4  ${tdCls}`}>{u.correo_institucional}</td>
                  <td className="px-5 py-4 ">
                    <div className="flex items-center gap-2">
                      {u.id_usuario === currentUser.id ? (
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg border ${modoOscuro ? 'text-slate-500 border-slate-600/30 bg-slate-600/10' : 'text-slate-500 border-slate-300/30 bg-slate-100'}`}>
                          Eres tú
                        </span>
                      ) : u.id_rol === 3 ? (
                        <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold px-2 py-1 rounded-lg border border-red-400/30 bg-red-400/10">
                          Admin
                        </span>
                      ) : (
                        <select
                          value={u.id_rol}
                          onChange={(e) => onRoleChange(u.id_usuario, Number(e.target.value))}
                          className={`${selectCls} text-xs py-1 px-2 w-auto max-w-[140px] ${
                            u.id_rol === 3 ? '!text-red-400' :
                            u.id_rol === 4 ? '!text-amber-400' :
                            u.id_rol === 2 ? '!text-emerald-400' :
                            u.id_rol === 7 ? '!text-purple-400' :
                            u.id_rol === 6 ? '!text-blue-400' :
                            '!text-blue-400'
                          }`}
                        >
                          <option value={1} style={{ color: '#60a5fa' }}>Alumno</option>
                          <option value={6} style={{ color: '#60a5fa' }}>Responsable del mural</option>
                          <option value={2} style={{ color: '#34d399' }}>Responsable del club</option>
                          <option value={5} style={{ color: '#34d399' }}>Vicepresidente</option>
                          <option value={7} style={{ color: '#c084fc' }}>Coordinación</option>
                          <option value={4} style={{ color: '#fbbf24' }}>Rectoría</option>
                        </select>
                      )}
                      <AccionesUsuario u={u} currentUser={currentUser} onAdminAction={onAdminAction} onEliminarUsuario={onEliminarUsuario} />
                    </div>
                  </td>
                  <td className="px-5 py-4 ">
                    <AsignacionClubUsuario u={u} clubesActivosList={clubesActivosList} asignando={asignando} onRemoveFromClub={onRemoveFromClub} onAsignarClub={onAsignarClub} onAsignarAlumnoClub={onAsignarAlumnoClub} usuarios={usuarios} currentUser={currentUser} selectCls={selectCls} setConfirmPendiente={setConfirmPendiente} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile - tarjetas */}
      <div className="space-y-2 md:hidden">
        {filtrados.map((u) => (
          <div key={u.id_usuario} className={`rounded-xl border p-3 ${modoOscuro ? 'bg-[#0e162c] border-slate-700/50' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono ${tdCls}`}>#{u.id_usuario}</span>
                  <Badge texto={{
                    1: 'Alumno',
                    2: 'Responsable del club',
                    3: 'Administrador',
                    4: 'Rectoría',
                    5: 'Vicepresidente',
                    6: 'Responsable del mural',
                    7: 'Coordinación',
                  }[u.id_rol] || (u.rol === 'presidente' ? 'Responsable del club' : u.rol)} color={u.id_rol === 3 ? 'red' : u.id_rol === 4 ? 'amber' : u.id_rol === 2 ? 'emerald' : u.id_rol === 7 ? 'purple' : 'blue'} size="sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <AccionesUsuario u={u} currentUser={currentUser} onAdminAction={onAdminAction} onEliminarUsuario={onEliminarUsuario} />
                </div>
              </div>
            <p className={`text-sm font-semibold mb-0.5 ${tdTitle}`}>{u.nombre_completo}</p>
            <p className={`text-xs mb-2 ${tdCls}`}>{u.correo_institucional}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Club:</span>
              <AsignacionClubUsuario u={u} clubesActivosList={clubesActivosList} asignando={asignando} onRemoveFromClub={onRemoveFromClub} onAsignarClub={onAsignarClub} onAsignarAlumnoClub={onAsignarAlumnoClub} usuarios={usuarios} currentUser={currentUser} selectCls={selectCls} setConfirmPendiente={setConfirmPendiente} />
            </div>
          </div>
        ))}
      </div>

      <ModalConfirmacion
        show={!!confirmPendiente}
        titulo="Confirmar asignación"
        mensaje={confirmPendiente?.mensaje || ''}
        textoConfirmar="Confirmar"
        onConfirmar={confirmarAsignacion}
        onCancelar={() => setConfirmPendiente(null)}
      />
    </>
  );
}
