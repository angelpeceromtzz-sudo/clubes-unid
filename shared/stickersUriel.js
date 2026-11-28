export const STICKERS_URIEL = Object.freeze([
  { id: 'saludo', nombre: 'Saludo', frase: '¡Hola!' },
  { id: 'feliz', nombre: 'Feliz', frase: '¡Qué alegría!' },
  { id: 'genial', nombre: 'Genial', frase: '¡Genial!' },
  { id: 'celebracion', nombre: 'Celebración', frase: '¡Lo logramos!' },
  { id: 'aplausos', nombre: 'Aplausos', frase: '¡Bravo!' },
  { id: 'abrazo', nombre: 'Abrazo', frase: 'Un abrazo' },
  { id: 'gracias', nombre: 'Gracias', frase: '¡Gracias!' },
  { id: 'animo', nombre: 'Ánimo', frase: '¡Tú puedes!' },
  { id: 'pensando', nombre: 'Pensando', frase: 'Déjame pensar' },
  { id: 'sorpresa', nombre: 'Sorpresa', frase: '¡No me digas!' },
  { id: 'tristeza', nombre: 'Tristeza', frase: 'Estoy contigo' },
  { id: 'travieso', nombre: 'Travieso', frase: 'Je, je…' },
]);

const porId = new Map(STICKERS_URIEL.map(sticker => [sticker.id, sticker]));
const patronSticker = /^\[uriel-sticker:([a-z]+)\]$/;

export function buscarStickerUriel(id) {
  return typeof id === 'string' ? porId.get(id) || null : null;
}

export function contenidoStickerUriel(id) {
  return buscarStickerUriel(id) ? `[uriel-sticker:${id}]` : null;
}

export function leerStickerUriel(contenido) {
  if (typeof contenido !== 'string') return null;
  const id = contenido.match(patronSticker)?.[1];
  return id ? buscarStickerUriel(id) : null;
}
