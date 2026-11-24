import { campoActividadVisible } from '../../../shared/actividades';
import { useTheme } from '../../contexts/ThemeContext';
import { ImagenPregunta } from './ImagenPregunta';

export function ImagenesCuestionarioActividad({ campos, respuestas, excluirClaves = [] }) {
  const { tema } = useTheme();
  const imagenes = campos.filter((campo) => {
    const valor = respuestas?.[campo.clave];
    const respondida = valor !== undefined && valor !== null && String(valor).trim() !== '';
    return campo.imagen_url && !excluirClaves.includes(campo.clave) && !respondida && campoActividadVisible(campo, respuestas);
  });
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

export function ImagenesResumenActividad({ campos, respuestas, excluirClaves = [] }) {
  const { tema } = useTheme();
  const imagenes = campos.filter((campo) => {
    const valor = respuestas?.[campo.clave];
    const respondida = valor !== undefined && valor !== null && String(valor).trim() !== '';
    return campo.imagen_url && !excluirClaves.includes(campo.clave) && respondida && campoActividadVisible(campo, respuestas);
  });
  if (!imagenes.length) return null;

  return <section aria-label="Imágenes ampliadas de las respuestas" className="space-y-4 border-t border-slate-400/25 pt-5">
    {imagenes.map((campo) => <figure key={campo.clave} className="mx-auto w-full max-w-xl space-y-2">
      <ImagenPregunta src={campo.imagen_url} alt={'Imagen para ' + campo.etiqueta} className="max-h-[34rem] min-h-48 w-full" />
      <figcaption className={'text-center text-sm font-semibold ' + tema.title}>{campo.etiqueta}</figcaption>
    </figure>)}
  </section>;
}
