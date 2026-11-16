/* Sección de perfil del alumno: datos personales, preferencias e intereses. */
import { Link } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { useCatalogoIntereses } from '../../../hooks/useCatalogoIntereses';
import { Icono } from '../../ui/Icono';
import { Alerta } from '../../ui/Alerta';
import { BotonAccion } from '../../ui/BotonAccion';

const NOMBRE_PREFERENCIA = {
  categorias: 'Categorías de interés',
  actividades: 'Actividades de interés',
  motivaciones: 'Motivaciones',
};

function ListaChips({ items, vacio }) {
  const { modoOscuro } = useTheme();
  if (!items || items.length === 0) {
    return <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>{vacio}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id ?? item}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            modoOscuro ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {item.nombre ?? item}
        </span>
      ))}
    </div>
  );
}

export function SeccionPerfilAlumno({ d }) {
  const { modoOscuro, cardCls } = useTheme();
  const { catalogo, estado, reintentar } = useCatalogoIntereses();
  const u = d.user || {};
  const pref = d.preferencias || {};
  const catMap = new Map((catalogo?.categorias ?? []).map((c) => [c.id, c.nombre]));
  const actMap = new Map((catalogo?.actividades ?? []).map((a) => [a.id, a.nombre]));
  const motMap = new Map((catalogo?.motivaciones ?? []).map((m) => [m.id, m.nombre]));
  const categorias = (pref.categorias ?? []).map((id) => ({ id, nombre: catMap.get(id) || `Categoría ${id}` }));
  const actividades = (pref.actividades ?? []).map((id) => ({ id, nombre: actMap.get(id) || `Actividad ${id}` }));
  const motivaciones = (pref.motivaciones ?? []).map((id) => ({ id, nombre: motMap.get(id) || `Motivación ${id}` }));

  return (
    <div className="space-y-6">
      {estado === 'cargando' && <p role="status">Cargando nombres de tus intereses…</p>}
      {estado === 'error' && <div role="alert" className="space-y-2"><Alerta tipo="error" mensaje="No se pudieron cargar los nombres de tus intereses." /><BotonAccion variant="outline" onClick={reintentar}>Reintentar</BotonAccion></div>}
      <section className={`${cardCls} rounded-2xl border p-4 sm:p-6`}>
        <h2 className={`text-lg font-bold mb-4 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Datos personales</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className={`font-semibold ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Nombre</dt>
            <dd className={modoOscuro ? 'text-slate-200' : 'text-slate-800'}>{u.nombre_completo || '—'}</dd>
          </div>
          <div>
            <dt className={`font-semibold ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Correo</dt>
            <dd className={modoOscuro ? 'text-slate-200' : 'text-slate-800'}>{u.correo_institucional || '—'}</dd>
          </div>
          <div>
            <dt className={`font-semibold ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Licenciatura</dt>
            <dd className={modoOscuro ? 'text-slate-200' : 'text-slate-800'}>{pref.licenciatura_nombre || '—'}</dd>
          </div>
          <div>
            <dt className={`font-semibold ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>Periodo actual</dt>
            <dd className={modoOscuro ? 'text-slate-200' : 'text-slate-800'}>{pref.periodo_actual_nombre || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className={`${cardCls} rounded-2xl border p-4 sm:p-6`}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className={`text-lg font-bold ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Preferencias e intereses</h2>
          <Link
            to="/perfil/preferencias"
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
              modoOscuro ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Icono nombre="edit" className="h-4 w-4" />
            Editar
          </Link>
        </div>

        <div className="space-y-4">
          <div>
            <p className={`text-sm font-semibold mb-2 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{NOMBRE_PREFERENCIA.categorias}</p>
            <ListaChips
              items={categorias.length ? categorias : []}
              vacio="Sin categorías seleccionadas."
            />
          </div>
          <div>
            <p className={`text-sm font-semibold mb-2 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{NOMBRE_PREFERENCIA.actividades}</p>
            <ListaChips
              items={actividades.length ? actividades : []}
              vacio="Sin actividades seleccionadas."
            />
          </div>
          <div>
            <p className={`text-sm font-semibold mb-2 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>{NOMBRE_PREFERENCIA.motivaciones}</p>
            <ListaChips
              items={motivaciones.length ? motivaciones : []}
              vacio="Sin motivaciones seleccionadas."
            />
          </div>
          <div>
            <p className={`text-sm font-semibold mb-2 ${modoOscuro ? 'text-slate-300' : 'text-slate-700'}`}>Correo opcional</p>
            <p className={`text-sm ${modoOscuro ? 'text-slate-400' : 'text-slate-500'}`}>
              {pref.correo?.activo ? 'Activado' : 'Desactivado'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}