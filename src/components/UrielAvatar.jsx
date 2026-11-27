import saludo from '../../diseno/reacciones-lobo/svg/saludo.svg';
import pensando from '../../diseno/reacciones-lobo/svg/pensando.svg';
import feliz from '../../diseno/reacciones-lobo/svg/feliz.svg';
import curiosidad from '../../diseno/reacciones-lobo/svg/curiosidad.svg';
import confusion from '../../diseno/reacciones-lobo/svg/confusion.svg';
import preocupacion from '../../diseno/reacciones-lobo/svg/preocupacion.svg';
import orgullo from '../../diseno/reacciones-lobo/svg/orgullo.svg';
import './UrielAvatar.css';

const expresiones = { saludo, pensando, feliz, curiosidad, confusion, preocupacion, orgullo };

export function UrielAvatar({ expresion = 'saludo', tamano = 'mensaje', decorativo = true }) {
  const gesto = expresiones[expresion] ? expresion : 'saludo';
  return <span className={`uriel-avatar uriel-avatar--${tamano} uriel-avatar--${gesto}`} aria-hidden={decorativo ? 'true' : undefined}>
    <img src={expresiones[gesto]} alt={decorativo ? '' : `Uriel, el lobo de ClubsUNID, ${gesto}`} draggable="false" />
  </span>;
}
