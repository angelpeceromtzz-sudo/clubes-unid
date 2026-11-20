import { useId } from 'react';

const CORAZON = 'M0 3C-6-5-13 1-10 7L0 16 10 7C13 1 6-5 0 3Z';

// La misma silueta angular, orejas y hocico del lobo de ClubsUNID, con gestos propios.
export function LoboReaccion({ tipo, animado = false }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const amor = tipo === 'love';
  const aplauso = tipo === 'clap';
  return <svg viewBox="0 0 96 100" aria-hidden="true" focusable="false"
    className={'lobo-reaccion lobo-reaccion--' + tipo + (animado ? ' lobo-reaccion--animado' : '')}>
    <defs>
      <linearGradient id={id + '-oro'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe151"/><stop offset="0.55" stopColor="#ffc400"/><stop offset="1" stopColor="#dd9400"/></linearGradient>
      <linearGradient id={id + '-luz'} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff3b0"/><stop offset="1" stopColor="#ffd64c"/></linearGradient>
    </defs>
    <g className="lobo-reaccion__rayos" fill="#fbbf24"><path d="m6 30 4-9 5 9Z"/><path d="m81 23 7-7 1 11Z"/><path d="m44 8 4-8 4 8Z"/></g>
    <g className="lobo-reaccion__cabeza">
      <path d="M15 7 37 22H59L81 7 79 40 92 55 81 67 74 82 57 91H39L22 82 15 67 4 55 17 40Z" fill="#281041" stroke="#100823" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="m20 15 18 13-17 13Z" fill={'url(#' + id + '-oro)'}/><path d="m76 15-18 13 17 13Z" fill={'url(#' + id + '-oro)'}/>
      <path d="m20 16 2 21 5-5Z" fill="#fff8dc"/><path d="m76 16-2 21-5-5Z" fill="#e9a400"/>
      <path d="M38 26H58L75 42 85 55 74 65 68 79 56 86H40L28 79 22 65 11 55 21 43Z" fill={'url(#' + id + '-oro)'}/>
      <path d="m38 26-7 17-13 11 9 5-5 6 10 12-11-7-4-12-6-3 10-12Z" fill="#fff8e6"/>
      <path d="m58 26 7 18 12 12-8 4 4 7-10 13 11-8 2-9 9-8-10-13Z" fill="#d58f00" opacity="0.65"/>
      <path d="m38 26 10 8 7-4-6 12 10 2-12 13-3-15-9-3Z" fill="#e4a000" opacity="0.7"/>
      {amor ? <g className="lobo-reaccion__ojos" fill="#ed5474" stroke="#8d2349" strokeWidth="1.1">
        <path d={CORAZON} transform="translate(32 46) scale(.7)"/><path d={CORAZON} transform="translate(64 46) scale(.7)"/>
      </g> : aplauso ? <g fill="none" stroke="#201033" strokeWidth="3.5" strokeLinecap="round"><path d="m25 53 6-5 7 5"/><path d="m58 53 7-5 6 5"/></g> : <g className="lobo-reaccion__ojos">
        <path d="m24 46 16 4-3 10-11-4Z" fill="#fff8dc"/><path d="m72 46-16 4 3 10 11-4Z" fill="#fff8dc"/>
        <path d="m24 46 16 4M72 46l-16 4" fill="none" stroke="#201033" strokeWidth="3" strokeLinecap="round"/>
        <ellipse cx="33" cy="54" rx="3" ry="4.5" fill="#201033"/><ellipse cx="63" cy="54" rx="3" ry="4.5" fill="#201033"/>
        <circle cx="34" cy="52.5" r="1" fill="white"/><circle cx="64" cy="52.5" r="1" fill="white"/>
      </g>}
      {amor && <g fill="#f08570" opacity="0.55"><ellipse cx="26" cy="61" rx="6" ry="2.8"/><ellipse cx="70" cy="61" rx="6" ry="2.8"/></g>}
      <path d="m35 61 13 3 13-3 3 14-16 11-16-11Z" fill={'url(#' + id + '-luz)'}/>
      <path d="M40 63h16l-7 8h-2Z" fill="#160b2c"/>
      <path d={aplauso ? 'M37 73q11 16 22 0Z' : 'M38 73q10 9 20 0M48 71v5'} fill={aplauso ? '#29113f' : 'none'} stroke="#29113f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {aplauso && <path d="M43 79q5-4 10 0l-5 3Z" fill="#ed7990"/>}
    </g>
    {amor && <g className="lobo-reaccion__corazones" fill="#ed5474"><path d={CORAZON} transform="translate(15 24) scale(.5)"/><path d={CORAZON} transform="translate(81 17) scale(.4)"/></g>}
    {aplauso && <g fill={'url(#' + id + '-luz)'} stroke="#281041" strokeWidth="2.5" strokeLinejoin="round">
      <g className="lobo-reaccion__pata lobo-reaccion__pata--izquierda"><path d="m17 76-2-7 5-3 4 4 1-6 5 1 1 6 4-3 4 4-4 6 1 9-11 5-8-6Z"/><g fill="#9c671c" stroke="none"><ellipse cx="27" cy="81" rx="4.5" ry="4"/><circle cx="21" cy="74" r="1.7"/><circle cx="28" cy="72" r="1.7"/><circle cx="34" cy="75" r="1.7"/></g></g>
      <g className="lobo-reaccion__pata lobo-reaccion__pata--derecha"><path d="m79 76 2-7-5-3-4 4-1-6-5 1-1 6-4-3-4 4 4 6-1 9 11 5 8-6Z"/><g fill="#9c671c" stroke="none"><ellipse cx="69" cy="81" rx="4.5" ry="4"/><circle cx="75" cy="74" r="1.7"/><circle cx="68" cy="72" r="1.7"/><circle cx="62" cy="75" r="1.7"/></g></g>
    </g>}
  </svg>;
}
