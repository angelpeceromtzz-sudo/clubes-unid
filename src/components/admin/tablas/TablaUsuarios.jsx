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
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b text-left ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>ID</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Nombre</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Correo</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Rol</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Club</th>
                <th className={`px-5 py-4 text-[10px] uppercase tracking-wider font-bold ${thCls}`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id_usuario} className={`border-b transition-colors ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <td className={`px-5 py-4 font-mono text-xs ${tdCls}`}>{u.id_usuario}</td>
                  <td className={`px-5 py-4 font-medium ${tdTitle}`}>{u.nombre_completo}</td>
                  <td className={`px-5 py-4 ${tdCls}`}>{u.correo_institucional}</td>
                  <td className="px-5 py-4">
                    <Badge texto={u.rol} color={
                      u.id_rol === 3 ? 'red' : u.id_rol === 2 ? 'amber' : 'blue'
                    } size="md" />
                  </td>
                  <td className="px-5 py-4">
                    <AsignacionClubUsuario u={u} clubesActivosList={clubesActivosList} asignando={asignando} onRemoveFromClub={onRemoveFromClub} onAsignarClub={onAsignarClub} onAsignarAlumnoClub={onAsignarAlumnoClub} usuarios={usuarios} currentUser={currentUser} selectCls={selectCls} setConfirmPendiente={setConfirmPendiente} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <AccionesUsuario u={u} currentUser={currentUser} onRoleChange={onRoleChange} onAdminAction={onAdminAction} onEliminarUsuario={onEliminarUsuario} modoOscuro={modoOscuro} selectCls={selectCls} />
                    </div>
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
                  <Badge texto={u.rol} color={u.id_rol === 3 ? 'red' : u.id_rol === 2 ? 'amber' : 'blue'} size="sm" />
                </div>
                <div className="flex items-center gap-1.5">
                  <AccionesUsuario u={u} currentUser={currentUser} onRoleChange={onRoleChange} onAdminAction={onAdminAction} onEliminarUsuario={onEliminarUsuario} modoOscuro={modoOscuro} selectCls={selectCls} />
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
