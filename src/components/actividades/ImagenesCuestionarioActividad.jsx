import { campoActividadVisible } from '../../../shared/actividades';
import { useTheme } from '../../contexts/ThemeContext';
import { ImagenPregunta } from './ImagenPregunta';

export function ImagenesCuestionarioActividad({ campos, respuestas }) {
  const { tema } = useTheme();
  const imagenes = campos.filter((campo) => campo.imagen_url && campoActividadVisible(campo, respuestas));
  if (!imagenes.length) return null;

  return <section aria-label="Imágenes de referencia del cuestionario" className="border-t border-slate-400/25 pt-5">
    <div className="flex flex-wrap items-start justify-center gap-6">
      {imagenes.map((campo) => <figure key={campo.clave} className="w-full max-w-xs space-y-2">
        <ImagenPregunta src={campo.imagen_url} alt={'Imagen para ' + campo.etiqueta} className="h-64 w-full" />
        <figcaption className={'text-center text-sm font-semibold ' + tema.title}>{campo.etiqueta}</figcaption>
      </figure>)}
    </div>
  </section>;
}
