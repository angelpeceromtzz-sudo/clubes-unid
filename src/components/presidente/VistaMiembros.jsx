import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { AvatarInicial } from '../ui/AvatarInicial';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Alerta } from '../ui/Alerta';
import { ModalConfirmacion } from '../ui/ModalConfirmacion';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';

export function VistaMiembros({ club, esPresidente, onActualizarClub }) {
  const { tema, modoOscuro } = useTheme();
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [asignando, setAsignando] = useState(null);
  const [modalVP, setModalVP] = useState(null);
  const [miembroABajar, setMiembroABajar] = useState(null);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      setError('');
      try {
        const data = await api.getMiembros(club.id_club);
        if (montado) setMiembros(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  async function handleBajar(usuario) {
    setMiembroABajar(usuario);
  }

  async function confirmarBajarMiembro() {
    const usuario = miembroABajar;
    setMiembroABajar(null);
    try {
      await api.bajarMiembro(usuario.id_usuario);
      setMiembros((prev) => prev.filter((m) => m.id_usuario !== usuario.id_usuario));
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmarVP() {
    if (!modalVP) return;
    const { usuario, accion } = modalVP;
    const esQuitar = accion === 'quitar';
    setAsignando(usuario.id_usuario);
    setModalVP(null);
    try {
      const result = await api.updateVicepresidente(club.id_club, esQuitar ? null : usuario.id_usuario);
      if (onActualizarClub) onActualizarClub({ id_vicepresidente: result.id_vicepresidente });
    } catch (err) {
      setError(err.message);
    } finally {
      setAsignando(null);
    }
  }

  if (cargando) return <Spinner />;

  const tieneVP = club.id_vicepresidente != null;

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Miembros del Club"
        subtitulo={`${miembros.length} miembro(s) activo(s) en ${club.nombre_club}`}
      />

      {error && <Alerta tipo="error" mensaje={error} />}

      {miembros.length === 0 ? (
        <EmptyState icono="users" titulo="Sin miembros" descripcion="Aún no hay miembros inscritos en este club." />
      ) : (
        <div className="space-y-2">
          {miembros.map((m) => {
            const esPresidenteDelClub = club.id_presidente === m.id_usuario;
            const esVicepresidente = club.id_vicepresidente === m.id_usuario;

            const puedeQuitarVP = esPresidente && esVicepresidente;
            const puedeAsignarVP = esPresidente && !esPresidenteDelClub && !esVicepresidente && !tieneVP;

            return (
              <div
                key={m.id_usuario}
                className={`group rounded-xl px-5 py-3 flex items-center justify-between ${
                  modoOscuro ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AvatarInicial nombre={m.nombre_completo} color="amber" />
                  <div>
                    <p className={`text-sm font-medium ${tema.title}`}>
                      {m.nombre_completo}
                      {esPresidenteDelClub && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 font-bold">Presidente</span>
                      )}
                      {esVicepresidente && !esPresidenteDelClub && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-blue-400 font-bold">Vicepresidente</span>
                      )}
                      {!esPresidenteDelClub && !esVicepresidente && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold">Miembro</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{m.correo_institucional}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                  {(puedeQuitarVP || puedeAsignarVP) && (
                    <button
                      onClick={() => setModalVP({ usuario: m, accion: esVicepresidente ? 'quitar' : 'asignar' })}
                      disabled={asignando === m.id_usuario}
                      className={`max-sm:opacity-100 md:opacity-0 md:group-hover:opacity-100 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer
                        ${asignando === m.id_usuario ? 'opacity-50 cursor-not-allowed' : ''}
                        ${esVicepresidente
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                    >
                      {asignando === m.id_usuario ? '...' : esVicepresidente ? 'Quitar Vicepresidente' : 'Hacer Vicepresidente'}
                    </button>
                  )}
                  {!esPresidenteDelClub && (
                    <button
                      onClick={() => handleBajar(m)}
                      className={`text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors cursor-pointer ${
                        modoOscuro
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-red-500 hover:bg-red-50'
                      }`}
                    >
                      Expulsar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalVP && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalVP(null)} />
          <div className={`relative w-full max-w-md rounded-2xl p-6 shadow-xl ${
            modoOscuro ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200'
          }`}>
            <div className="text-center">
              <div className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${
                modalVP.accion === 'asignar' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
              }`}>
                <span className={`text-2xl ${modalVP.accion === 'asignar' ? 'text-emerald-400' : 'text-blue-400'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
              <h3 className={`text-lg font-bold ${tema.title}`}>
                {modalVP.accion === 'asignar' ? 'Designar Vicepresidente' : 'Quitar Vicepresidente'}
              </h3>
              <p className={`mt-2 text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-600'}`}>
                {modalVP.accion === 'asignar'
                  ? `\u00BFSeguro que quieres designar a ${modalVP.usuario.nombre_completo} como Vicepresidente del club?`
                  : `\u00BFSeguro que quieres quitar a ${modalVP.usuario.nombre_completo} como Vicepresidente?`}
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalVP(null)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  modoOscuro ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarVP}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer ${
                  modalVP.accion === 'asignar'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {modalVP.accion === 'asignar' ? 'Designar' : 'Quitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirmacion
        show={!!miembroABajar}
        titulo="Expulsar del club"
        mensaje={miembroABajar ? `¿Expulsar a ${miembroABajar.nombre_completo} del club?` : ''}
        textoConfirmar="Expulsar"
        varianteDanger
        onConfirmar={confirmarBajarMiembro}
        onCancelar={() => setMiembroABajar(null)}
      />
    </div>
  );
}
