import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../services/api';
import { convocatoriaService } from '../../../services/convocatoria.service';
import { ModalConfiguracionConvocatoria } from '../../responsable/modales/ModalConfiguracionConvocatoria';
import { SeccionConvocatorias } from '../../responsable/secciones/SeccionConvocatorias';

export function SeccionConvocatoriasAdmin() {
  const { tema, inputCls } = useTheme();
  const [clubes, setClubes] = useState([]);
  const [idClub, setIdClub] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const lista = await api.getClubesAdmin();
      const resultados = await Promise.allSettled(
        lista.map(async (c) => {
          const [config, bloques] = await Promise.all([
            api.getConvocatoriaClub(c.id_club),
            convocatoriaService.getConvocatorias(c.id_club),
          ]);
          const inscripcionPendiente = config.solicitud?.estado === 'pendiente';
          const bloquesPendientes = Array.isArray(bloques) && bloques.some((x) => x.estado_revision === 'pendiente');
          return { ...c, inscripcionPendiente, bloquesPendientes, tienePendiente: inscripcionPendiente || bloquesPendientes };
        })
      );
      const fallos = resultados.filter((r) => r.status === 'rejected');
      if (fallos.length) setError(`No se pudieron verificar las convocatorias de ${fallos.length} club(es). Intenta actualizar la lista.`);
      const ordenados = resultados
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter(Boolean)
        .sort((a, b) => (b.tienePendiente === a.tienePendiente ? 0 : b.tienePendiente ? 1 : -1));
      setClubes(ordenados);
      setIdClub((anterior) => {
        if (ordenados.some((c) => String(c.id_club) === anterior && c.tienePendiente)) return anterior;
        const primeroPendiente = ordenados.find((c) => c.tienePendiente);
        return primeroPendiente ? String(primeroPendiente.id_club) : '';
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => { if (activo) await cargar(); })();
    return () => { activo = false; };
  }, [cargar]);

  const club = clubes.find((c) => String(c.id_club) === idClub);
  const hayPendientes = clubes.some((c) => c.tienePendiente);

  return (
    <section className="max-w-5xl space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className={tema.title + ' text-xl font-bold'}>Revisión de convocatorias</h2>
          <p className={tema.subtitle + ' mt-1 text-sm'}>Los presidentes crean las convocatorias. Coordinación VIVE (admin) las aprueba y publica o devuelve con observaciones.</p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className={`text-xs font-semibold cursor-pointer ${tema.btnInactive}`}
        >
          {cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {cargando ? (
        <p className={`text-sm ${tema.subtitle}`}>Cargando clubes…</p>
      ) : clubes.length === 0 && !error ? (
        <p className={`text-sm ${tema.subtitle}`}>No hay clubes registrados.</p>
      ) : !hayPendientes ? (
        !error && <p className={`text-sm ${tema.subtitle}`}>No hay convocatorias pendientes de revisión.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            Hay clubes con convocatorias pendientes
          </div>
          <label className={tema.title + ' block text-xs font-semibold'}>
            Club
            <select
              aria-label="Seleccionar club para convocatorias"
              value={idClub}
              onChange={(e) => setIdClub(e.target.value)}
              className={inputCls + ' mt-2'}
            >
              <option value="">Selecciona un club…</option>
              {clubes.filter((c) => c.tienePendiente).map((c) => (
                <option key={c.id_club} value={c.id_club}>
                  {c.nombre_club} · {[
                    c.inscripcionPendiente && 'Inscripción',
                    c.bloquesPendientes && 'Evaluaciones',
                  ].filter(Boolean).join(' y ')}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {club && (
        <>
          {club.inscripcionPendiente && <ModalConfiguracionConvocatoria key={'config-' + club.id_club} club={club} onRevisada={cargar} />}
          {club.bloquesPendientes && <SeccionConvocatorias key={club.id_club} club={club} onRevisada={cargar} />}
        </>
      )}
    </section>
  );
}
