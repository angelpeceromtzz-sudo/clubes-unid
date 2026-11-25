// Biblioteca de diseño independiente. No amplía las reacciones de la aplicación.
// Las tres variantes originales conservan los trazos de LoboReaccion.jsx.
export const REACCIONES = [
  { id: 'like', archivo: 'me-gusta', nombre: 'Me gusta', grupo: 'Originales', gesto: 'Asiente con la cabeza.', claves: 'aprobación apoyo', original: true },
  { id: 'love', archivo: 'me-encanta', nombre: 'Me encanta', grupo: 'Originales', gesto: 'Inclina la cabeza y aparecen corazones.', claves: 'amor cariño corazón', original: true },
  { id: 'clap', archivo: 'aplausos', nombre: 'Aplausos', grupo: 'Originales', gesto: 'Celebra juntando las patitas.', claves: 'felicidades reconocimiento', original: true },
  { id: 'happy', archivo: 'feliz', nombre: 'Feliz', grupo: 'Alegría', gesto: 'Da un pequeño salto de alegría.', claves: 'sonrisa contento felicidad' },
  { id: 'laugh', archivo: 'me-divierte', nombre: 'Me divierte', grupo: 'Alegría', gesto: 'Se ríe con los ojos cerrados.', claves: 'risa divertido jajaja humor' },
  { id: 'wink', archivo: 'guino', nombre: 'Guiño', grupo: 'Alegría', gesto: 'Inclina la cabeza con complicidad.', claves: 'guiñar complicidad' },
  { id: 'cool', archivo: 'genial', nombre: 'Genial', grupo: 'Alegría', gesto: 'Saluda con sus lentes puestos.', claves: 'cool lentes estilo' },
  { id: 'celebrate', archivo: 'celebracion', nombre: 'Celebración', grupo: 'Alegría', gesto: 'Salta entre confeti.', claves: 'fiesta logro festejo felicidades' },
  { id: 'proud', archivo: 'orgullo', nombre: 'Orgullo', grupo: 'Alegría', gesto: 'Levanta la cabeza con satisfacción.', claves: 'logro satisfecho confianza' },
  { id: 'inspired', archivo: 'inspirado', nombre: 'Inspirado', grupo: 'Alegría', gesto: 'Le brillan los ojos.', claves: 'estrellas idea inspiración admiración' },
  { id: 'hug', archivo: 'abrazo', nombre: 'Abrazo', grupo: 'Cariño', gesto: 'Acerca las patitas para abrazar.', claves: 'te abrazo acompañamiento apoyo' },
  { id: 'grateful', archivo: 'gracias', nombre: 'Gracias', grupo: 'Cariño', gesto: 'Junta las patitas y hace una reverencia.', claves: 'gratitud agradecimiento por favor' },
  { id: 'kiss', archivo: 'besito', nombre: 'Besito', grupo: 'Cariño', gesto: 'Lanza un corazón al aire.', claves: 'beso amor cariño' },
  { id: 'shy', archivo: 'timidez', nombre: 'Timidez', grupo: 'Cariño', gesto: 'Baja un poco la cabeza, sonrojado.', claves: 'tímido pena rubor' },
  { id: 'relieved', archivo: 'alivio', nombre: 'Alivio', grupo: 'Cariño', gesto: 'Suelta el aire con una sonrisa.', claves: 'tranquilidad paz respiro' },
  { id: 'wow', archivo: 'sorpresa', nombre: 'Sorpresa', grupo: 'Matices', gesto: 'Se echa un poquito hacia atrás.', claves: 'wow asombro increíble' },
  { id: 'thinking', archivo: 'pensando', nombre: 'Pensando', grupo: 'Matices', gesto: 'Inclina la cabeza con una pata en el mentón.', claves: 'pensar idea reflexión duda' },
  { id: 'curious', archivo: 'curiosidad', nombre: 'Curiosidad', grupo: 'Matices', gesto: 'Se asoma con una ceja levantada.', claves: 'curioso interés atención' },
  { id: 'confused', archivo: 'confusion', nombre: 'Confusión', grupo: 'Matices', gesto: 'Mueve la cabeza de un lado al otro.', claves: 'confundido duda pregunta no entiendo' },
  { id: 'sad', archivo: 'tristeza', nombre: 'Tristeza', grupo: 'Matices', gesto: 'Deja caer un poco la cabeza.', claves: 'triste desánimo lo siento' },
  { id: 'cry', archivo: 'llanto', nombre: 'Llanto', grupo: 'Matices', gesto: 'Tiembla suavemente mientras caen lágrimas.', claves: 'llorar lágrimas tristeza' },
  { id: 'angry', archivo: 'enojo', nombre: 'Enojo', grupo: 'Matices', gesto: 'Sacude la cabeza con el ceño fruncido.', claves: 'enojado enfado molestia' },
  { id: 'worried', archivo: 'preocupacion', nombre: 'Preocupación', grupo: 'Matices', gesto: 'Se inquieta y aparece una gotita.', claves: 'nervioso preocupación miedo' },
  { id: 'sleepy', archivo: 'sueno', nombre: 'Sueño', grupo: 'Matices', gesto: 'Cabecea mientras se queda dormido.', claves: 'dormir cansancio descanso zzz' },
  { id: 'wave', archivo: 'saludo', nombre: 'Saludo', grupo: 'Cariño', gesto: 'Mueve una patita para saludar.', claves: 'hola adiós bienvenida saludar' },
  { id: 'cheer', archivo: 'animo', nombre: '¡Ánimo!', grupo: 'Alegría', gesto: 'Levanta una patita con fuerza para darte ánimos.', claves: 'motivación vamos fuerza apoyo puedes' },
  { id: 'sick', archivo: 'enfermito', nombre: 'Enfermito', grupo: 'Matices', gesto: 'Cabecea con su termómetro y unas onditas de calor.', claves: 'enfermo fiebre salud malestar recuperación' },
  { id: 'playful', archivo: 'travieso', nombre: 'Travieso', grupo: 'Alegría', gesto: 'Inclina la cabeza, guiña un ojo y saca la lengua.', claves: 'broma bromista juguetón lengua travesura' },
].map((reaccion, indice) => ({
  ...reaccion,
  numero: String(indice + 1).padStart(2, '0'),
  original: Boolean(reaccion.original),
}));

const CORAZON = 'M0 3C-6-5-13 1-10 7L0 16 10 7C13 1 6-5 0 3Z';
const ESTRELLA = 'm0-8 2.4 5.2 5.6.7-4.1 4 1 5.6L0 4.8l-4.9 2.7 1-5.6-4.1-4 5.6-.7Z';
const TRAZO = 'fill="none" stroke="#201033" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';

export function escapar(valor) {
  return String(valor).replace(/[&<>"']/g, (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);
}

function ojosAbiertos({ mirada = 0, elevados = false, tristes = false } = {}) {
  const borde = tristes ? 'm24 50 16-4M72 50l-16-4' : elevados ? 'M24 44q8-6 16 0M56 44q8-6 16 0' : 'm24 46 16 4M72 46l-16 4';
  return `<g class="lobo-reaccion__ojos">
    <path d="m24 46 16 4-3 10-11-4Z" fill="#fff8dc"/><path d="m72 46-16 4 3 10 11-4Z" fill="#fff8dc"/>
    <path d="${borde}" fill="none" stroke="#201033" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="${33 + mirada}" cy="54" rx="3" ry="4.5" fill="#201033"/><ellipse cx="${63 + mirada}" cy="54" rx="3" ry="4.5" fill="#201033"/>
    <circle cx="${34 + mirada}" cy="52.5" r="1" fill="white"/><circle cx="${64 + mirada}" cy="52.5" r="1" fill="white"/>
  </g>`;
}

function ojos(tipo) {
  if (tipo === 'love') return `<g class="lobo-reaccion__ojos" fill="#ed5474" stroke="#8d2349" stroke-width="1.1"><path d="${CORAZON}" transform="translate(32 46) scale(.7)"/><path d="${CORAZON}" transform="translate(64 46) scale(.7)"/></g>`;
  if (tipo === 'clap') return `<g ${TRAZO}><path d="m25 53 6-5 7 5"/><path d="m58 53 7-5 6 5"/></g>`;
  if (['happy', 'celebrate', 'hug', 'grateful'].includes(tipo)) return `<g ${TRAZO}><path d="M25 53q6-10 13 0M58 53q7-10 13 0"/></g>`;
  if (tipo === 'laugh') return `<g ${TRAZO}><path d="m26 47 11 6-11 4m44-10-11 6 11 4"/></g>`;
  if (['wink', 'playful'].includes(tipo)) return `<g><path d="m24 46 16 4-3 10-11-4Z" fill="#fff8dc"/><path d="m24 46 16 4m17 8 7-4 7 4" ${TRAZO}/><ellipse cx="33" cy="54" rx="3" ry="4.5" fill="#201033"/><circle cx="34" cy="52.5" r="1" fill="white"/></g>`;
  if (tipo === 'cool') return `<g class="lobo-reaccion__lentes"><path d="m19 46 23 2-3 14-14-2Zm58 0-23 2 3 14 14-2Z" fill="#231331" stroke="#100823" stroke-width="2.5" stroke-linejoin="round"/><path d="M42 50q6-4 12 0m-35-4-5-2m63 2 5-2" ${TRAZO}/><path d="m25 49 9 2-8 6Zm34 2 11-2-9 8Z" fill="#bda7d3" opacity=".75"/></g>`;
  if (tipo === 'inspired') return `<g fill="#fff8dc" stroke="#281041" stroke-width="1.5"><path d="${ESTRELLA}" transform="translate(32 52) scale(1.12)"/><path d="${ESTRELLA}" transform="translate(64 52) scale(1.12)"/></g>`;
  if (tipo === 'kiss') return `<g ${TRAZO}><path d="m26 51 6-4 7 4m18 0 7-4 6 4"/></g>`;
  if (tipo === 'shy') return `<g ${TRAZO}><path d="m26 49 6 4 7-4m18 0 7 4 6-4"/></g>`;
  if (tipo === 'relieved') return `<g ${TRAZO}><path d="M25 49q6 8 13 0m20 0q7 8 13 0"/></g>`;
  if (tipo === 'wow') return `<g><path d="M24 38q7-5 14-1m20 0q7-4 14 1" ${TRAZO}/><ellipse cx="32" cy="51" rx="7" ry="9" fill="#fff8dc"/><ellipse cx="64" cy="51" rx="7" ry="9" fill="#fff8dc"/><g fill="#201033"><ellipse cx="32" cy="52" rx="3" ry="4.5"/><ellipse cx="64" cy="52" rx="3" ry="4.5"/></g><g fill="white"><circle cx="33" cy="50" r="1.2"/><circle cx="65" cy="50" r="1.2"/></g></g>`;
  if (tipo === 'thinking') return `<g><path d="M25 50q7-4 14 0M57 46q7-6 14-2" ${TRAZO}/><path d="m25 51 14 1-2 7-10-2Zm32-2 14-2-2 10-10 2Z" fill="#fff8dc"/><g fill="#201033"><ellipse cx="35" cy="53" rx="2.8" ry="3.5"/><ellipse cx="67" cy="51" rx="2.8" ry="3.5"/></g></g>`;
  if (tipo === 'curious') return ojosAbiertos({ mirada: 2, elevados: true }) + `<path d="m23 39 16-3" ${TRAZO}/>`;
  if (tipo === 'confused') return `<g><path d="m24 44 15 3m18-6 14-3" ${TRAZO}/><ellipse cx="32" cy="54" rx="7" ry="5.5" fill="#fff8dc"/><ellipse cx="64" cy="51" rx="6.5" ry="8" fill="#fff8dc"/><g fill="#201033"><circle cx="31" cy="54" r="3"/><circle cx="65" cy="51" r="3"/></g></g>`;
  if (['sad', 'worried'].includes(tipo)) return ojosAbiertos({ tristes: true });
  if (tipo === 'cry') return `<g><path d="m25 45 13-5m20 0 13 5M25 53q6-8 13 0m20 0q7-8 13 0" ${TRAZO}/><g class="lobo-reaccion__lagrimas" fill="#69c8ee" stroke="#3699c5" stroke-width="1"><path d="m26 55 10 1-1 16q-5 10-10 0Z"/><path d="m60 56 10-1 1 17q-5 10-10 0Z"/></g><path d="m29 59-1 11m36-11 1 11" fill="none" stroke="#d8f5ff" stroke-width="2" stroke-linecap="round"/></g>`;
  if (tipo === 'angry') return `<g><path d="m24 48 16 5-3 8-11-5Zm48 0-16 5 3 8 11-5Z" fill="#fff8dc"/><path d="m23 44 17 9m33-9-17 9" fill="none" stroke="#201033" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="34" cy="56" rx="3" ry="3.8" fill="#201033"/><ellipse cx="62" cy="56" rx="3" ry="3.8" fill="#201033"/></g>`;
  if (tipo === 'sleepy') return `<g ${TRAZO}><path d="M25 51q6 5 13 0m20 0q7 5 13 0"/></g>`;
  if (tipo === 'wave') return ojosAbiertos({ elevados: true });
  if (tipo === 'cheer') return `<g><path d="m24 46 16 4-3 10-11-4Zm48 0-16 4 3 10 11-4Z" fill="#fff8dc"/><path d="m24 43 16 6m32-6-16 6" ${TRAZO}/><ellipse cx="34" cy="54" rx="3" ry="4.5" fill="#201033"/><ellipse cx="62" cy="54" rx="3" ry="4.5" fill="#201033"/><circle cx="35" cy="52.5" r="1" fill="white"/><circle cx="63" cy="52.5" r="1" fill="white"/></g>`;
  if (tipo === 'sick') return `<g ${TRAZO}><path d="m25 42 13-3m20 0 13 3M25 50q6 4 13 0m20 0q7 4 13 0"/></g>`;
  return ojosAbiertos();
}

function boca(tipo) {
  if (['clap', 'happy', 'celebrate', 'wave', 'cheer'].includes(tipo)) return `<path d="M37 73q11 16 22 0Z" fill="#29113f" stroke="#29113f" stroke-width="2" stroke-linejoin="round"/><path d="M43 79q5-4 10 0l-5 3Z" fill="#ed7990"/>`;
  if (tipo === 'laugh') return `<path d="M35 71q13 21 26 0Z" fill="#29113f" stroke="#29113f" stroke-width="2" stroke-linejoin="round"/><path d="M38 73h20l-3 4H41Z" fill="#fff8dc"/><path d="M43 81q5-4 10 0l-5 3Z" fill="#ed7990"/>`;
  if (['wow', 'sleepy'].includes(tipo)) return `<ellipse cx="48" cy="78" rx="${tipo === 'wow' ? 5 : 3.5}" ry="${tipo === 'wow' ? 6 : 4.5}" fill="#29113f"/>`;
  if (tipo === 'kiss') return `<path d="m44 72 7 3-6 3 6 2-6 3" fill="none" stroke="#8d2349" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (tipo === 'playful') return `<path d="M37 73q11 14 22 0Z" fill="#29113f" stroke="#29113f" stroke-width="2" stroke-linejoin="round"/><g class="lobo-reaccion__lengua"><path d="M48 77h9v6q-4.5 9-9 0Z" fill="#ed7990" stroke="#8d2349" stroke-width="1.2"/><path d="M52.5 79v5" fill="none" stroke="#bd4d70" stroke-width="1.2" stroke-linecap="round"/></g>`;
  const trazos = {
    thinking: 'M39 78q8-5 15-1', curious: 'M39 75q9 8 19-2', confused: 'm38 78 5-3 5 3 5-3 5 3',
    sad: 'M39 80q9-10 18 0', cry: 'M39 80q9-12 18 0Z', angry: 'M38 80q10-8 20 0',
    worried: 'M40 79q8-8 16 0', shy: 'M42 77q6 5 12 0', proud: 'M37 75q10 8 22-3', sick: 'M41 77h13',
  };
  return `<path d="${trazos[tipo] || 'M38 73q10 9 20 0M48 71v5'}" fill="${tipo === 'cry' ? '#29113f' : 'none'}" stroke="#29113f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function mejillas(tipo) {
  if (['love', 'hug', 'grateful', 'kiss', 'shy', 'happy', 'wave', 'sick', 'playful'].includes(tipo)) {
    return `<g fill="#f08570" opacity="${tipo === 'shy' ? '.8' : '.55'}"><ellipse cx="26" cy="61" rx="6" ry="2.8"/><ellipse cx="70" cy="61" rx="6" ry="2.8"/></g>${tipo === 'shy' ? '<path d="m22 60 2 3m3-3 2 3m38-3 2 3m3-3 2 3" fill="none" stroke="#c6575c" stroke-width="1.2" stroke-linecap="round"/>' : ''}`;
  }
  return '';
}

function efectos(tipo) {
  if (tipo === 'love') return `<g class="lobo-reaccion__corazones" fill="#ed5474" opacity="0"><path d="${CORAZON}" transform="translate(15 24) scale(.5)"/><path d="${CORAZON}" transform="translate(81 17) scale(.4)"/></g>`;
  if (tipo === 'celebrate') return `<g class="lobo-reaccion__efecto" fill="none" stroke-width="3" stroke-linecap="round"><path d="m7 18 2 5m-5 19 4-2m79-17 4-3m-3 21 4 2m-45-35 2-5" stroke="#ed5474"/><path d="m4 31 4 1m76-21 2-5m-49 4-2-6m56 49 3 2" stroke="#8c6bc6"/><path d="m12 7-3-3m81 31 4 1m-38-23 3-5" stroke="#fbbf24"/></g>`;
  if (['inspired', 'proud', 'cool', 'curious'].includes(tipo)) return `<g class="lobo-reaccion__efecto" fill="${tipo === 'cool' ? '#a78bce' : '#e9ad12'}"><path d="M8 27l2-6 2 6 5 2-5 2-2 6-2-6-5-2Zm77 9 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z"/></g>`;
  if (tipo === 'kiss') return `<g class="lobo-reaccion__beso" fill="#ed5474" stroke="#8d2349" stroke-width=".7"><path d="${CORAZON}" transform="translate(79 64) rotate(-14) scale(.65)"/></g>`;
  if (tipo === 'hug') return `<g class="lobo-reaccion__efecto"><path d="${CORAZON}" transform="translate(48 81) scale(.65)" fill="#ed5474" stroke="#8d2349" stroke-width="1.3"/></g>`;
  if (tipo === 'grateful') return `<g class="lobo-reaccion__efecto" stroke="#e9ad12" stroke-width="2.3" stroke-linecap="round"><path d="m8 49-4-3m7 13-5 1m82-11 4-3m-7 13 5 1"/></g>`;
  if (tipo === 'relieved') return `<path class="lobo-reaccion__aire" d="M77 65h7q7 0 7-5t-6-2m-8 14h9q7 0 7 5t-6 2" fill="none" stroke="#b2a2c5" stroke-width="2.3" stroke-linecap="round"/>`;
  if (tipo === 'thinking') return `<g class="lobo-reaccion__efecto" fill="#f5ebff" stroke="#8c6bc6" stroke-width="1.4"><circle cx="10" cy="39" r="2"/><circle cx="9" cy="30" r="3"/><circle cx="8" cy="18" r="5"/></g>`;
  if (tipo === 'confused') return `<g class="lobo-reaccion__efecto" fill="none" stroke="#8c6bc6" stroke-width="3" stroke-linecap="round"><path d="M81 25q0-8 7-7t2 10l-4 4v2"/><circle cx="86" cy="40" r="1.6" fill="#8c6bc6" stroke="none"/></g>`;
  if (tipo === 'angry') return `<path class="lobo-reaccion__efecto" d="M81 22v6h-6m12-6v6h6m-12 12v-6h-6m12 6v-6h6" fill="none" stroke="#d35d64" stroke-width="2.4" stroke-linecap="round"/>`;
  if (tipo === 'worried') return `<g class="lobo-reaccion__gota"><path d="M82 30q-10 13-7 18t9 0q3-5-2-18Z" fill="#69c8ee" stroke="#3699c5" stroke-width="1.2"/><path d="m80 39-2 6" stroke="#d8f5ff" stroke-width="1.8" stroke-linecap="round"/></g>`;
  if (tipo === 'sleepy') return `<g class="lobo-reaccion__efecto" fill="none" stroke="#8c6bc6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M77 33h9l-9 10h9m-6-28h11l-11 12h11M65 5h8l-8 9h8"/></g>`;
  if (tipo === 'wave') return `<g class="lobo-reaccion__efecto" fill="none" stroke="#8c6bc6" stroke-width="2.2" stroke-linecap="round"><path d="M84 40q6 2 7 7m-6-15q8 3 9 10"/></g>`;
  if (tipo === 'cheer') return `<g class="lobo-reaccion__efecto"><path d="m12 26-9 12 7-1-3 12 13-17-8 2 6-8Z" fill="#ffc400" stroke="#654281" stroke-width="1.2" stroke-linejoin="round"/><path d="m82 29 5-4m-3 12 7-1" fill="none" stroke="#e9ad12" stroke-width="2.4" stroke-linecap="round"/></g>`;
  if (tipo === 'sick') return `<g><g class="lobo-reaccion__calor" fill="none" stroke="#b2a2c5" stroke-width="2.1" stroke-linecap="round"><path d="M8 32q-5 4 0 8t0 8m80-30q-5 4 0 8t0 8"/></g><g class="lobo-reaccion__termometro"><path d="M52 76 80 65q4-2 6 1t-3 6L55 82Z" fill="#e3f5ff" stroke="#3e7293" stroke-width="1.8" stroke-linejoin="round"/><path d="m56 79 24-10" stroke="#e66b7c" stroke-width="2.3" stroke-linecap="round"/><ellipse cx="56" cy="79" rx="2.3" ry="1.6" fill="#e66b7c"/><path d="m70 71 1 2m4-4 1 2m3-4 1 2" stroke="#3e7293" stroke-width="1.1"/></g></g>`;
  return '';
}

function patas(tipo, luz) {
  if (tipo === 'clap') return `<g fill="${luz}" stroke="#281041" stroke-width="2.5" stroke-linejoin="round">
    <g class="lobo-reaccion__pata lobo-reaccion__pata--izquierda"><path d="m17 76-2-7 5-3 4 4 1-6 5 1 1 6 4-3 4 4-4 6 1 9-11 5-8-6Z"/><g fill="#9c671c" stroke="none"><ellipse cx="27" cy="81" rx="4.5" ry="4"/><circle cx="21" cy="74" r="1.7"/><circle cx="28" cy="72" r="1.7"/><circle cx="34" cy="75" r="1.7"/></g></g>
    <g class="lobo-reaccion__pata lobo-reaccion__pata--derecha"><path d="m79 76 2-7-5-3-4 4-1-6-5 1-1 6-4-3-4 4 4 6-1 9 11 5 8-6Z"/><g fill="#9c671c" stroke="none"><ellipse cx="69" cy="81" rx="4.5" ry="4"/><circle cx="75" cy="74" r="1.7"/><circle cx="68" cy="72" r="1.7"/><circle cx="62" cy="75" r="1.7"/></g></g>
  </g>`;
  if (tipo === 'hug') return `<g class="lobo-reaccion__abrazo" fill="${luz}" stroke="#281041" stroke-width="2.2" stroke-linejoin="round"><path d="M16 74q-7 0-6 9 3 13 24 13l9-7q4-6 0-9t-8 2l-6 5q-8-1-8-8Z"/><path d="M80 74q7 0 6 9-3 13-24 13l-9-7q-4-6 0-9t8 2l6 5q8-1 8-8Z"/><path d="m35 83 5 6m-8-3 5 6m24-9-5 6m8-3-5 6" fill="none" stroke="#b7832a" stroke-width="1.3" stroke-linecap="round"/></g>`;
  if (tipo === 'grateful') return `<g class="lobo-reaccion__gracias" fill="${luz}" stroke="#281041" stroke-width="2.2" stroke-linejoin="round"><path d="M48 94H35q-6-5-2-12l9-14q4-4 6 1Z"/><path d="M48 94h13q6-5 2-12l-9-14q-4-4-6 1Z"/><path d="M48 72v20m-9-14-3 7m21-7 3 7" fill="none" stroke="#b7832a" stroke-width="1.4" stroke-linecap="round"/></g>`;
  if (tipo === 'thinking') return `<g class="lobo-reaccion__pensando" fill="${luz}" stroke="#281041" stroke-width="2.2" stroke-linejoin="round"><path d="m59 91-3-12-6-2q-4-2-2-5t6-1l6 3-1-8q0-5 4-4t4 5l2 12-2 11Z"/><path d="m59 80 6-2m-5 7 6-2" stroke="#b7832a" stroke-width="1.2" stroke-linecap="round"/></g>`;
  if (tipo === 'wave') return `<g class="lobo-reaccion__saludo" fill="${luz}" stroke="#281041" stroke-width="2.2" stroke-linejoin="round"><path d="m73 92-4-8V74l-3-7q-1-3 2-5t5 4l1 2-1-14q0-4 3-4t3 4l1 11 2-14q1-3 4-2t2 5l-2 14 4-7q1-2 3 0t-1 5l-5 13-1 10Z"/><g fill="#9c671c" stroke="none"><ellipse cx="79" cy="79" rx="5" ry="5.5"/><circle cx="75.5" cy="66" r="1.7"/><circle cx="83.5" cy="64" r="1.7"/><circle cx="88.5" cy="71" r="1.6"/></g></g>`;
  if (tipo === 'cheer') return `<g class="lobo-reaccion__animo" fill="${luz}" stroke="#281041" stroke-width="2.2" stroke-linejoin="round"><path d="m13 94-3-11-1-10q0-4 4-5h15q5 1 6 5v6l4-2q4 0 4 4l-7 11-10 4Z"/><path d="M16 70v8m7-8v7m6-6v6m-16 5h16l5 4" fill="none" stroke="#b7832a" stroke-width="1.4" stroke-linecap="round"/></g>`;
  return '';
}

export const ANIMACIONES_CSS = `
.lobo-reaccion { display: block; width: 100%; height: 100%; overflow: visible; }
.lobo-reaccion__cabeza { transform-origin: 48px 78px; }
.lobo-reaccion__pata--izquierda { transform-origin: 26px 90px; }
.lobo-reaccion__pata--derecha { transform-origin: 70px 90px; }
.lobo-reaccion__abrazo, .lobo-reaccion__gracias { transform-origin: 48px 90px; }
.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-alegre 550ms ease-out; }
.lobo-reaccion--like.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-asiente 420ms ease-out; }
.lobo-reaccion--love.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-carino 450ms ease-out; }
.lobo-reaccion--love.lobo-reaccion--animado .lobo-reaccion__corazones { animation: lobo-corazones 500ms ease-out both; }
.lobo-reaccion--clap.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-celebra 450ms ease-out; }
.lobo-reaccion--clap.lobo-reaccion--animado .lobo-reaccion__pata--izquierda { animation: lobo-aplauso-izquierdo 450ms ease-out; }
.lobo-reaccion--clap.lobo-reaccion--animado .lobo-reaccion__pata--derecha { animation: lobo-aplauso-derecho 450ms ease-out; }
.lobo-reaccion--laugh.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-risa 600ms ease-out; }
.lobo-reaccion--wink.lobo-reaccion--animado .lobo-reaccion__cabeza,
.lobo-reaccion--cool.lobo-reaccion--animado .lobo-reaccion__cabeza,
.lobo-reaccion--thinking.lobo-reaccion--animado .lobo-reaccion__cabeza,
.lobo-reaccion--curious.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-inclina 600ms ease-out; }
.lobo-reaccion--hug.lobo-reaccion--animado .lobo-reaccion__abrazo { animation: lobo-abrazo 600ms ease-out; }
.lobo-reaccion--grateful.lobo-reaccion--animado .lobo-reaccion__cabeza,
.lobo-reaccion--shy.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-asiente 650ms ease-in-out; }
.lobo-reaccion--kiss.lobo-reaccion--animado .lobo-reaccion__beso { animation: lobo-besito 650ms ease-out; }
.lobo-reaccion--relieved.lobo-reaccion--animado .lobo-reaccion__aire { animation: lobo-respiro 650ms ease-out; }
.lobo-reaccion--wow.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-sorpresa 550ms ease-out; }
.lobo-reaccion--confused.lobo-reaccion--animado .lobo-reaccion__cabeza,
.lobo-reaccion--angry.lobo-reaccion--animado .lobo-reaccion__cabeza,
.lobo-reaccion--worried.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-duda 600ms ease-out; }
.lobo-reaccion--sad.lobo-reaccion--animado .lobo-reaccion__cabeza,
.lobo-reaccion--sleepy.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-descansa 700ms ease-in-out; }
.lobo-reaccion--cry.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-risa 650ms ease-in-out; }
.lobo-reaccion__saludo { transform-origin: 78px 89px; }
.lobo-reaccion__animo { transform-origin: 24px 91px; }
.lobo-reaccion--wave.lobo-reaccion--animado .lobo-reaccion__saludo { animation: lobo-saluda 650ms ease-in-out; }
.lobo-reaccion--cheer.lobo-reaccion--animado .lobo-reaccion__animo { animation: lobo-motiva 600ms ease-out; }
.lobo-reaccion--sick.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-descansa 700ms ease-in-out; }
.lobo-reaccion--sick.lobo-reaccion--animado .lobo-reaccion__termometro { animation: lobo-descansa 700ms ease-in-out; transform-origin: 48px 78px; }
.lobo-reaccion--sick.lobo-reaccion--animado .lobo-reaccion__calor { animation: lobo-calor 700ms ease-out; }
.lobo-reaccion--playful.lobo-reaccion--animado .lobo-reaccion__cabeza { animation: lobo-inclina 600ms ease-out; }
.lobo-reaccion--animado .lobo-reaccion__efecto { animation: lobo-destello 650ms ease-out; transform-origin: 48px 48px; }
.lobo-reaccion--animado .lobo-reaccion__gota { animation: lobo-gota 650ms ease-out; }
@keyframes lobo-asiente { 0%, 100% { transform: none; } 35% { transform: translateY(5px) rotate(5deg); } 70% { transform: translateY(-2px) rotate(-3deg); } }
@keyframes lobo-carino { 0%, 100% { transform: none; } 40% { transform: rotate(-9deg) scale(1.08); } 75% { transform: rotate(5deg); } }
@keyframes lobo-corazones { 0% { opacity: 0; transform: translateY(8px) scale(.85); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(-12px) scale(1.1); } }
@keyframes lobo-celebra { 0%, 100% { transform: none; } 30%, 70% { transform: translateY(-5px); } 50% { transform: translateY(1px); } }
@keyframes lobo-aplauso-izquierdo { 0%, 100% { transform: none; } 30%, 70% { transform: translateX(9px) rotate(17deg); } 50% { transform: translateX(2px); } }
@keyframes lobo-aplauso-derecho { 0%, 100% { transform: none; } 30%, 70% { transform: translateX(-9px) rotate(-17deg); } 50% { transform: translateX(-2px); } }
@keyframes lobo-alegre { 0%, 100% { transform: none; } 35% { transform: translateY(-5px) scale(1.04); } 65% { transform: translateY(2px); } }
@keyframes lobo-risa { 0%, 100% { transform: none; } 20%, 60% { transform: translateY(-2px) rotate(-3deg); } 40%, 80% { transform: translateY(2px) rotate(3deg); } }
@keyframes lobo-inclina { 0%, 100% { transform: none; } 40% { transform: rotate(-8deg); } 70% { transform: rotate(3deg); } }
@keyframes lobo-abrazo { 0%, 100% { transform: none; } 45% { transform: translateY(-3px) scale(.93, 1.06); } }
@keyframes lobo-besito { 0%, 100% { transform: none; opacity: 1; } 65% { transform: translate(5px, -8px); opacity: .25; } }
@keyframes lobo-respiro { 0%, 100% { transform: none; opacity: 1; } 65% { transform: translateX(3px); opacity: .2; } }
@keyframes lobo-sorpresa { 0%, 100% { transform: none; } 35% { transform: translateY(-4px) scale(1.08); } 70% { transform: scale(.98); } }
@keyframes lobo-duda { 0%, 100% { transform: none; } 25%, 75% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes lobo-descansa { 0%, 100% { transform: none; } 55% { transform: translateY(5px) rotate(4deg); } }
@keyframes lobo-destello { 0%, 100% { opacity: 1; transform: none; } 45% { opacity: .35; transform: scale(1.08); } }
@keyframes lobo-gota { 0%, 100% { transform: none; } 65% { transform: translateY(5px); opacity: .4; } }
@keyframes lobo-saluda { 0%, 100% { transform: none; } 25%, 65% { transform: rotate(10deg); } 45%, 85% { transform: rotate(-9deg); } }
@keyframes lobo-motiva { 0%, 100% { transform: none; } 40% { transform: translateY(-5px) rotate(-5deg); } 70% { transform: translateY(1px); } }
@keyframes lobo-calor { 0%, 100% { opacity: 1; transform: none; } 60% { opacity: .3; transform: translateY(-3px); } }
@media (prefers-reduced-motion: reduce) {
  .lobo-reaccion, .lobo-reaccion * { animation: none !important; transition: none !important; }
}
`;

export function dibujarLobo(reaccion, { prefijo = reaccion.id, decorativo = false, posicion = 'width="96" height="100"', animaciones = false } = {}) {
  const id = escapar(prefijo);
  const tipo = reaccion.id;
  const oro = `url(#${id}-oro)`;
  const luz = `url(#${id}-luz)`;
  const accesibilidad = decorativo ? 'aria-hidden="true"' : `role="img" aria-labelledby="${id}-titulo ${id}-descripcion"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 100" ${posicion} ${accesibilidad} focusable="false" class="lobo-reaccion lobo-reaccion--${tipo}">
  <title id="${id}-titulo">${escapar(reaccion.nombre)} · Lobo ClubsUNID</title>
  <desc id="${id}-descripcion">Lobo dorado de silueta angular, orejas puntiagudas y contorno morado. ${escapar(reaccion.gesto)}</desc>
  ${animaciones ? `<style>${ANIMACIONES_CSS}</style>` : ''}
  <defs>
    <linearGradient id="${id}-oro" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe151"/><stop offset="0.55" stop-color="#ffc400"/><stop offset="1" stop-color="#dd9400"/></linearGradient>
    <linearGradient id="${id}-luz" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff3b0"/><stop offset="1" stop-color="#ffd64c"/></linearGradient>
  </defs>
  <g class="lobo-reaccion__rayos" fill="#fbbf24" opacity="${tipo === 'clap' ? '.75' : '0'}"><path d="m6 30 4-9 5 9Z"/><path d="m81 23 7-7 1 11Z"/><path d="m44 8 4-8 4 8Z"/></g>
  <g class="lobo-reaccion__cabeza">
    <path d="M15 7 37 22H59L81 7 79 40 92 55 81 67 74 82 57 91H39L22 82 15 67 4 55 17 40Z" fill="#281041" stroke="#100823" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="m20 15 18 13-17 13Z" fill="${oro}"/><path d="m76 15-18 13 17 13Z" fill="${oro}"/>
    <path d="m20 16 2 21 5-5Z" fill="#fff8dc"/><path d="m76 16-2 21-5-5Z" fill="#e9a400"/>
    <path d="M38 26H58L75 42 85 55 74 65 68 79 56 86H40L28 79 22 65 11 55 21 43Z" fill="${oro}"/>
    <path d="m38 26-7 17-13 11 9 5-5 6 10 12-11-7-4-12-6-3 10-12Z" fill="#fff8e6"/>
    <path d="m58 26 7 18 12 12-8 4 4 7-10 13 11-8 2-9 9-8-10-13Z" fill="#d58f00" opacity="0.65"/>
    <path d="m38 26 10 8 7-4-6 12 10 2-12 13-3-15-9-3Z" fill="#e4a000" opacity="0.7"/>
    ${ojos(tipo)}
    ${mejillas(tipo)}
    <path d="m35 61 13 3 13-3 3 14-16 11-16-11Z" fill="${luz}"/>
    <path d="M40 63h16l-7 8h-2Z" fill="#160b2c"/>
    ${boca(tipo)}
  </g>
  ${patas(tipo, luz)}
  ${efectos(tipo)}
</svg>`;
}
