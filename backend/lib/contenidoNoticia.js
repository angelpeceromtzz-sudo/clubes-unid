const MAX_BLOQUES = 40;
const MAX_CARACTERES = 10000;
const MAX_ALT = 200;

function textoValido(texto, maximo) {
  return typeof texto === 'string' && texto.length <= maximo;
}

export function normalizarContenidoNoticia(entrada) {
  let documento = entrada;
  if (typeof entrada === 'string') {
    const texto = entrada.trim();
    if (!texto) return { error: 'El contenido es obligatorio' };
    documento = { version: 1, blocks: [{ type: 'paragraph', text: texto }] };
  }

  if (!documento || typeof documento !== 'object' || Array.isArray(documento)
      || documento.version !== 1 || !Array.isArray(documento.blocks)
      || documento.blocks.length === 0 || documento.blocks.length > MAX_BLOQUES) {
    return { error: 'El contenido debe ser un documento con hasta 40 bloques' };
  }

  let caracteres = 0;
  let tieneContenido = false;
  const blocks = [];

  for (const bloque of documento.blocks) {
    if (!bloque || typeof bloque !== 'object' || Array.isArray(bloque)) {
      return { error: 'El contenido incluye un bloque no válido' };
    }

    if (bloque.type === 'paragraph' || bloque.type === 'heading') {
      const maximo = bloque.type === 'heading' ? 200 : MAX_CARACTERES;
      if (!textoValido(bloque.text, maximo)) return { error: 'Un bloque de texto excede el límite permitido' };
      if (bloque.type === 'heading' && ![2, 3].includes(bloque.level)) {
        return { error: 'Los títulos deben usar nivel 2 o 3' };
      }
      const marks = bloque.marks ?? [];
      if (bloque.type === 'paragraph'
          && (!Array.isArray(marks) || marks.some((marca) => !['bold', 'italic'].includes(marca))
            || new Set(marks).size !== marks.length)) {
        return { error: 'El formato de texto solo admite negritas y cursivas' };
      }
      caracteres += bloque.text.length;
      if (bloque.text.trim()) tieneContenido = true;
      blocks.push(bloque.type === 'heading'
        ? { type: 'heading', level: bloque.level, text: bloque.text }
        : { type: 'paragraph', text: bloque.text, marks: [...marks] });
      continue;
    }

    if (bloque.type === 'image') {
      if (typeof bloque.url !== 'string' || bloque.url.length > 2048
          || typeof bloque.alt !== 'string' || bloque.alt.length > MAX_ALT) {
        return { error: 'La imagen o su texto alternativo no son válidos' };
      }
      let url;
      try { url = new URL(bloque.url); } catch { return { error: 'La URL de imagen no es válida' }; }
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.username || url.password) {
        return { error: 'Las imágenes deben ser HTTPS y estar alojadas en Cloudinary' };
      }
      tieneContenido = true;
      blocks.push({ type: 'image', url: url.toString(), alt: bloque.alt });
      continue;
    }

    return { error: 'Tipo de bloque no admitido' };
  }

  if (caracteres > MAX_CARACTERES) return { error: 'El contenido no puede exceder 10 000 caracteres' };
  if (!tieneContenido) return { error: 'El contenido no puede quedar vacío' };
  return { documento: { version: 1, blocks } };
}

export function textoPlanoNoticia(documento) {
  if (typeof documento === 'string') return documento;
  if (!documento || !Array.isArray(documento.blocks)) return '';
  return documento.blocks
    .filter((bloque) => bloque?.type === 'paragraph' || bloque?.type === 'heading')
    .map((bloque) => bloque.text ?? '')
    .filter(Boolean)
    .join('\n');
}

export function tieneContenidoNoticia(documento) {
  return documento.blocks.some((bloque) => bloque.type === 'image' || bloque.text.trim() !== '');
}
