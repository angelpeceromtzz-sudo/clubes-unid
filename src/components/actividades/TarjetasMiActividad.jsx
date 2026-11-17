import {Link} from 'react-router-dom';
import {useTheme} from '../../contexts/ThemeContext';
import {EstadoActividad} from './ActividadUI';
import {BotonAccion} from '../ui/BotonAccion';

export function TarjetasMiActividad({asignacion}) {
  const {tema,cardCls}=useTheme();
  if(asignacion.cargando || (!asignacion.error && !asignacion.actividades.length)) return null;
  return <section aria-label="Actividades a mi cargo" className="mb-6 min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <h2 className={'text-xl font-black '+tema.title}>Actividades a mi cargo</h2>
        <p className={'text-sm '+tema.subtitle}>Consulta las actividades que tienes a tu cargo y abre la que quieras administrar.</p>
      </div>
      <BotonAccion variant="outline" size="sm" aria-label="Actualizar mis actividades asignadas" onClick={asignacion.recargar}>Actualizar</BotonAccion>
    </header>
    {asignacion.error ? <p role="alert" className="text-sm text-red-600 dark:text-red-400">No se pudieron consultar tus actividades asignadas. Intenta actualizarlas.</p> : <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {asignacion.actividades.map((actividad)=><article key={actividad.id_actividad} className={'flex min-w-0 flex-col items-start gap-4 rounded-2xl border p-5 shadow-sm '+cardCls}>
          <EstadoActividad estado={actividad.estado}/>
          <h3 className={'break-words text-lg font-bold '+tema.title}>{actividad.nombre}</h3>
          <p className={'line-clamp-3 break-words text-sm leading-relaxed '+tema.subtitle}>{actividad.descripcion}</p>
          <Link to={'/actividades/gestion?registro='+actividad.id_actividad} aria-label={'Administrar '+actividad.nombre}
            className="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-400 px-4 py-3 text-xs font-black uppercase tracking-wider text-[#0e162c] transition-colors hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
            Administrar actividad
          </Link>
        </article>)}
      </div>}
  </section>;
}
