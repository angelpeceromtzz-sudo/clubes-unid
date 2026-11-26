import { normalizarDocumentoNoticia } from '../../utils/contenidoNoticia';

export function ContenidoNoticia({ contenido, className = '' }) {
  const documento = normalizarDocumentoNoticia(contenido);
  return (
    <div className={`space-y-3 break-words ${className}`}>
      {documento.blocks.map((bloque, indice) => {
        if (bloque.type === 'heading') {
          const Clase = bloque.level === 2 ? 'h2' : 'h3';
          return <Clase key={`h-${indice}`} className="font-bold leading-snug">{bloque.text}</Clase>;
        }
        if (bloque.type === 'image') {
          return <img key={`i-${indice}`} src={bloque.url} alt={bloque.alt} loading="lazy" className="max-h-[32rem] w-full rounded-xl object-contain" />;
        }
        const texto = bloque.marks.includes('bold') ? <strong>{bloque.text}</strong> : bloque.text;
        const contenidoFormateado = bloque.marks.includes('italic') ? <em>{texto}</em> : texto;
        return <p key={`p-${indice}`} className="whitespace-pre-line leading-relaxed">{contenidoFormateado}</p>;
      })}
    </div>
  );
}
