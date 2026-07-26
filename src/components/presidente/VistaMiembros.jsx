import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { AvatarInicial } from '../ui/AvatarInicial';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Alerta } from '../ui/Alerta';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';
import { Icono } from '../ui/Icono';

export function VistaMiembros({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
    if (!window.confirm(`¿Dar de baja a ${usuario.nombre_completo} del club?`)) return;
    try {
      await api.bajarMiembro(usuario.id_usuario);
      setMiembros((prev) => prev.filter((m) => m.id_usuario !== usuario.id_usuario));
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) return <Spinner />;

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
            const esPresidente = club.id_presidente === m.id_usuario;
            return (
              <div
                key={m.id_usuario}
                className={`rounded-xl px-5 py-3 flex items-center justify-between ${
                  modoOscuro ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AvatarInicial nombre={m.nombre_completo} color="amber" />
                  <div>
                    <p className={`text-sm font-medium ${tema.title}`}>
                      {m.nombre_completo}
                      {esPresidente && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 font-bold">Presidente</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{m.correo_institucional}</p>
                  </div>
                </div>

                {!esPresidente && (
                  <button
                    onClick={() => handleBajar(m)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      modoOscuro
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-red-500 hover:bg-red-50'
                    }`}
                  >
                    Dar de baja
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
