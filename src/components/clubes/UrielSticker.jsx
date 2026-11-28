import { buscarStickerUriel } from '../../../shared/stickersUriel.js';
import saludo from '../../../diseno/reacciones-lobo/svg/saludo.svg';
import feliz from '../../../diseno/reacciones-lobo/svg/feliz.svg';
import genial from '../../../diseno/reacciones-lobo/svg/genial.svg';
import celebracion from '../../../diseno/reacciones-lobo/svg/celebracion.svg';
import aplausos from '../../../diseno/reacciones-lobo/svg/aplausos.svg';
import abrazo from '../../../diseno/reacciones-lobo/svg/abrazo.svg';
import gracias from '../../../diseno/reacciones-lobo/svg/gracias.svg';
import animo from '../../../diseno/reacciones-lobo/svg/animo.svg';
import pensando from '../../../diseno/reacciones-lobo/svg/pensando.svg';
import sorpresa from '../../../diseno/reacciones-lobo/svg/sorpresa.svg';
import tristeza from '../../../diseno/reacciones-lobo/svg/tristeza.svg';
import travieso from '../../../diseno/reacciones-lobo/svg/travieso.svg';
import './UrielSticker.css';

const imagenes = { saludo, feliz, genial, celebracion, aplausos, abrazo, gracias, animo, pensando, sorpresa, tristeza, travieso };

export function UrielSticker({ id, compacto = false }) {
  const sticker = buscarStickerUriel(id);
  if (!sticker) return null;
  return <figure className={`uriel-sticker ${compacto ? 'uriel-sticker--compacto' : ''}`} aria-label={`Sticker de Uriel: ${sticker.frase}`}>
    <span className="uriel-sticker__destello" aria-hidden="true">✦</span>
    <img src={imagenes[id]} alt="" aria-hidden="true" draggable="false" />
    <figcaption>{sticker.frase}</figcaption>
  </figure>;
}
