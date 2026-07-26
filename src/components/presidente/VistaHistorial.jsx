import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { AvatarInicial } from '../ui/AvatarInicial';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Alerta } from '../ui/Alerta';
import { EncabezadoPagina } from '../ui/EncabezadoPagina';
import { Badge } from '../ui/Badge';

function formatearFecha(fechaIso) {
  if (!fechaIso) return null;
  const d = new Date(fechaIso);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function VistaHistorial({ club }) {
  const { tema, modoOscuro } = useTheme();
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let montado = true;
    async function cargar() {
      setError('');
      try {
        const data = await api.getHistorialMembresia(club.id_club);
        if (montado) setRegistros(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  if (cargando) return <Spinner />;

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Historial de Membresía"
        subtitulo={`Todas las altas y bajas de ${club.nombre_club}`}
      />

      {error && <Alerta tipo="error" mensaje={error} />}

      {registros.length === 0 ? (
        <EmptyState icono="file" titulo="Sin historial" descripcion="Aún no hay registros de membresía para este club." />
      ) : (
        <>
          <p className={`text-sm ${tema.subtitle}`}>
            Total: {registros.length} registro(s)
          </p>
          <div className="space-y-3">
            {registros.map((r) => {
              const esActivo = r.id_estatus_inscripcion === 1;
              return (
                <div
                  key={r.id_inscripcion}
                  className={`rounded-xl p-5 ${
                    modoOscuro ? 'bg-[#0e162c] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AvatarInicial nombre={r.nombre_completo} color="amber" />
                      <div>
                        <p className={`text-sm font-medium ${tema.title}`}>{r.nombre_completo}</p>
                        <p className="text-xs text-slate-500">{r.correo_institucional}</p>
                      </div>
                    </div>
                    <Badge
                      texto={esActivo ? 'Activo' : 'Baja'}
                      color={esActivo ? 'emerald' : 'red'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Entró</p>
                      <p className={`text-sm ${tema.text}`}>{formatearFecha(r.fecha_inscripcion) || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Salió</p>
                      <p className={`text-sm ${tema.text}`}>
                        {r.fecha_baja ? formatearFecha(r.fecha_baja) : '— (activo)'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
