import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MarcoGrafica, EstadoGrafica, TooltipGrafica, TablaGrafica } from './MarcoGrafica';
import { formatoGrafica, prepararPastel } from './graficas.utils';

function TooltipPastel({ active, payload }) {
  const fila = payload?.[0]?.payload;
  return <TooltipGrafica active={active} payload={payload} label={fila?.nombre}>
    {fila && <>
      <div className="grafica-unid__tooltip-fila"><span>Cantidad</span><strong>{formatoGrafica(fila.valor)}</strong></div>
      <div className="grafica-unid__tooltip-fila"><span>Del total</span><strong>{formatoGrafica(fila.porcentaje, '%')}</strong></div>
    </>}
  </TooltipGrafica>;
}

export function GraficaPastel({ titulo, subtitulo, datos = [], dataKey = 'valor', labelKey = 'nombre', unidad = 'respuestas', cargando, acciones, nota, ceja = 'Distribución', vacioMensaje = 'Todavía no hay respuestas para mostrar esta distribución.' }) {
  const compacto = useMediaQuery('(max-width: 639px)');
  const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');
  const composicion = prepararPastel(datos, dataKey, labelKey);
  const columnas = [
    { key: 'nombre', titulo: 'Categoría' },
    { key: 'valor', titulo: 'Cantidad', numero: true, render: (fila) => formatoGrafica(fila.valor) },
    { key: 'porcentaje', titulo: 'Del total', numero: true, render: (fila) => formatoGrafica(fila.porcentaje, '%') },
  ];
  return (
    <MarcoGrafica titulo={titulo} subtitulo={subtitulo} ceja={ceja} acciones={acciones} className="grafica-unid--pastel"
      resumen={composicion.valida && composicion.total > 0 ? { valor: formatoGrafica(composicion.total), etiqueta: unidad } : undefined}
      nota={nota ?? (composicion.sectores.some((fila) => fila.agrupada) ? 'Las opciones pequeñas se agrupan. Consulta el desglose completo en Ver datos.' : undefined)}
      detalle={<TablaGrafica titulo={titulo} columnas={columnas} filas={composicion.filas} />}>
      {cargando || !composicion.valida || !composicion.total ? <EstadoGrafica cargando={cargando} mensaje={composicion.valida ? vacioMensaje : 'La base de datos no permite calcular esta distribución.'} /> : (
        <div className="grafica-unid__pastel">
          <div className="grafica-unid__pastel-lienzo" aria-label={titulo + '. Total: ' + formatoGrafica(composicion.total, unidad) + '.'}>
            <ResponsiveContainer width="100%" height={compacto ? 225 : 245} minWidth={0}>
              <PieChart accessibilityLayer>
                <Pie data={composicion.sectores} dataKey="valor" nameKey="nombre" cx="50%" cy="50%" outerRadius="86%" startAngle={90} endAngle={-270}
                  stroke="var(--grafica-fondo)" strokeWidth={3} isAnimationActive={!reducirMovimiento}>
                  {composicion.sectores.map((fila) => <Cell key={fila.id} fill={fila.color} />)}
                </Pie>
                <Tooltip content={<TooltipPastel />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="grafica-unid__partes" aria-label="Distribución por categoría">
            {composicion.sectores.map((fila) => <li key={fila.id}>
              <span className="grafica-unid__parte-color" style={{ backgroundColor: fila.color }} aria-hidden="true" />
              <span className="grafica-unid__parte-nombre">{fila.nombre}</span>
              <span className="grafica-unid__parte-valor">{formatoGrafica(fila.valor)}<small>{formatoGrafica(fila.porcentaje, '%')}</small></span>
            </li>)}
          </ul>
        </div>
      )}
    </MarcoGrafica>
  );
}
