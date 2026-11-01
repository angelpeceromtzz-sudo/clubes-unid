import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MarcoGrafica, EstadoGrafica, TooltipGrafica, LeyendaGrafica, TablaGrafica, FormaBarra } from './MarcoGrafica';
import { COLORES_GRAFICA, formatoGrafica } from './graficas.utils';

function EtiquetaMes({ x, y, payload }) {
  const texto = String(payload?.value ?? '');
  const partes = texto.match(/^(.*)\s+(\d{4})$/);
  return <text x={x} y={y + 8} textAnchor="middle" fill="var(--grafica-texto-secundario)" fontSize={11}>
    <tspan x={x}>{partes ? partes[1] : texto}</tspan>
    {partes && <tspan x={x} dy={14} fill="var(--grafica-atenuado)" fontSize={10}>{partes[2]}</tspan>}
  </text>;
}

export function GraficaBarrasAgrupadas({ titulo, subtitulo, datos = [], series = [], cargando, vacioMensaje = 'Sin datos disponibles.' }) {
  const compacto = useMediaQuery('(max-width: 639px)');
  const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');
  const seriesVisibles = series.map((serie, indice) => ({ ...serie, color: serie.color ?? COLORES_GRAFICA[indice % COLORES_GRAFICA.length] }));
  const columnas = [
    { key: 'mes', titulo: 'Mes' },
    ...seriesVisibles.map((serie) => ({ key: serie.dataKey, titulo: serie.nombre, numero: true, render: (fila) => formatoGrafica(fila[serie.dataKey]) })),
  ];
  const rango = datos.length > 1 ? datos[0].mes + ' — ' + datos[datos.length - 1].mes : datos[0]?.mes;
  return (
    <MarcoGrafica titulo={titulo} subtitulo={subtitulo || rango} ceja="Evolución" resumen={{ valor: formatoGrafica(datos.length), etiqueta: datos.length === 1 ? 'mes' : 'meses' }}
      detalle={<TablaGrafica titulo={titulo} columnas={columnas} filas={datos} />}>
      {cargando || !datos.length ? <EstadoGrafica cargando={cargando} mensaje={vacioMensaje} /> : <>
        <LeyendaGrafica series={seriesVisibles} />
        <div className="grafica-unid__desplazable">
          <div className="grafica-unid__lienzo" style={{ height: 285, minWidth: compacto && datos.length > 6 ? datos.length * 45 : 0 }}>
            <ResponsiveContainer width="100%" height={285} minWidth={0}>
              <BarChart data={datos} barCategoryGap="28%" barGap={4} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--grafica-rejilla)" strokeDasharray="3 6" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tickMargin={12} height={compacto ? 46 : 36} interval={0}
                  tick={compacto ? <EtiquetaMes /> : { fill: 'var(--grafica-texto-secundario)', fontSize: 11 }} />
                <YAxis width={34} axisLine={false} tickLine={false} allowDecimals={false} tickCount={5}
                  tick={{ fill: 'var(--grafica-atenuado)', fontSize: 11 }} tickFormatter={(valor) => formatoGrafica(valor)} />
                <Tooltip content={<TooltipGrafica />} cursor={{ fill: 'var(--grafica-cursor)', radius: 6 }} />
                {seriesVisibles.map((serie) => <Bar key={serie.dataKey} dataKey={serie.dataKey} name={serie.nombre} fill={serie.color}
                  radius={[5, 5, 0, 0]} maxBarSize={compacto ? 16 : 24} shape={<FormaBarra />} isAnimationActive={!reducirMovimiento}>
                  <LabelList dataKey={serie.dataKey} position="top" fill="var(--grafica-texto)" fontSize={11} fontWeight={500} formatter={(valor) => formatoGrafica(valor)} />
                </Bar>)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>}
    </MarcoGrafica>
  );
}
