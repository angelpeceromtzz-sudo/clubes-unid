import { ImagenAmpliable } from '../ui/ImagenAmpliable';

export function ImagenPregunta({ src, alt, className = '' }) {
  if (!src) return null;
  return <ImagenAmpliable
    src={src}
    alt={alt}
    titulo={alt}
    textoPista="Ampliar"
    className={'group relative block cursor-zoom-in overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ' + className}
  >
    <img src={src} alt={alt} className="h-full w-full bg-slate-100 object-contain dark:bg-slate-800" />
  </ImagenAmpliable>;
}
