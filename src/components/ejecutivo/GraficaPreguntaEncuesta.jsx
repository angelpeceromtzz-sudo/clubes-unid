import { useState } from 'react';
import { GraficaBarrasHorizontales } from './GraficaBarrasHorizontales';
import { GraficaPastel } from './GraficaPastel';
import { admitePastel, numeroGrafica, formatoGrafica } from './graficas.utils';

export function GraficaPreguntaEncuesta({ pregunta }) {
  const permitePastel = admitePastel(pregunta);
  const [formato, setFormato] = useState('barras');
  const esMultiple = pregunta.tipo === 'opcion_multiple';
  const base = numeroGrafica(esMultiple ? pregunta.respondientes : pregunta.respuestas) ?? 0;
  const datos = (pregunta.opciones ?? []).map((opcion) => ({
    id: opcion.id_opcion,
    nombre: opcion.texto,
    valor: opcion.conteo,
    porcentaje: opcion.porcentaje,
  }));
  const nota = esMultiple
    ? formatoGrafica(base, 'respuestas') + ' con al menos una opción seleccionada. Cada envío puede elegir varias opciones; los porcentajes pueden sumar más de 100 %.'
    : 'Base: ' + formatoGrafica(base, 'respuestas') + ' a esta pregunta.';
  const acciones = permitePastel ? <div className="grafica-unid__formatos" role="group" aria-label="Formato de la gráfica de encuesta">
    <button type="button" aria-pressed={formato === 'barras'} onClick={() => setFormato('barras')}>Barras</button>
    <button type="button" aria-pressed={formato === 'pastel'} onClick={() => setFormato('pastel')}>Pastel</button>
  </div> : undefined;
  const comun = { titulo: pregunta.texto, datos: base > 0 ? datos : [], acciones, nota, vacioMensaje: 'Nadie ha respondido esta pregunta todavía.' };
  if (permitePastel && formato === 'pastel') return <GraficaPastel {...comun} />;
  return <GraficaBarrasHorizontales {...comun} unit="respuestas" />;
}
