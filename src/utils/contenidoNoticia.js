const FORMATO = 1;

export function normalizarDocumentoNoticia(entrada) {
  if (typeof entrada === 'string') {
    const texto = entrada.trim();
    return { version: FORMATO, blocks: texto ? [{ type: 'paragraph', text: texto, marks: [] }] : [] };
  }
  if (!entrada || typeof entrada !== 'object' || entrada.version !== FORMATO || !Array.isArray(entrada.blocks)) {
    return { version: FORMATO, blocks: [] };
  }

  const blocks = entrada.blocks.flatMap((bloque) => {
    if (!bloque || typeof bloque !== 'object') return [];
    if (bloque.type === 'paragraph' && typeof bloque.text === 'string') {
      return [{ type: 'paragraph', text: bloque.text, marks: Array.isArray(bloque.marks) ? bloque.marks.filter((m) => ['bold', 'italic'].includes(m)) : [] }];
    }
    if (bloque.type === 'heading' && typeof bloque.text === 'string' && [2, 3].includes(bloque.level)) {
      return [{ type: 'heading', text: bloque.text, level: bloque.level }];
    }
    if (bloque.type === 'image' && typeof bloque.url === 'string' && typeof bloque.alt === 'string') {
      try {
        const url = new URL(bloque.url);
        if (url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && !url.username && !url.password) {
          return [{ type: 'image', url: url.toString(), alt: bloque.alt }];
        }
      } catch { /* se descarta una URL inválida */ }
    }
    return [];
  });

  return { version: FORMATO, blocks };
}

export function textoPlanoNoticia(contenido) {
  return normalizarDocumentoNoticia(contenido).blocks
    .filter((bloque) => bloque.type === 'paragraph' || bloque.type === 'heading')
    .map((bloque) => bloque.text)
    .filter(Boolean)
    .join('\n');
}

export function tieneContenidoNoticia(contenido) {
  return normalizarDocumentoNoticia(contenido).blocks.some((bloque) =>
    bloque.type === 'image' || bloque.text?.trim(),
  );
}
