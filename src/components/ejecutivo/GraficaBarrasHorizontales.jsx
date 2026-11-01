import { useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MarcoGrafica, EstadoGrafica, TooltipGrafica, TablaGrafica, EtiquetaEje, EtiquetaValor, ControlFilas, FormaBarra } from './MarcoGrafica';
import { COLORES_GRAFICA, formatoGrafica, numeroGrafica } from './graficas.utils';

export function GraficaBarrasHorizontales({ titulo, subtitulo, datos = [], dataKey = 'valor', labelKey = 'nombre', unit = '', color, maxDomain, cargando, vacioMensaje = 'Sin datos disponibles.', acciones, nota }) {
  const compacto = useMediaQuery('(max-width: 639px)');
  const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [expandido, setExpandido] = useState(false);
  const filas = datos.map((fila) => ({ ...fila, _valor: numeroGrafica(fila[dataKey]) }));
  const visibles = expandido ? filas : filas.slice(0, 8);
  const alto = Math.max(240, visibles.length * (compacto ? 66 : 58) + 35);
  const maximo = maxDomain ?? Math.max(1, ...filas.map((fila) => fila._valor ?? 0));
  const columnas = [
    { key: labelKey, titulo: labelKey === 'nombre_club' ? 'Club' : 'Categoría' },
    { key: '_valor', titulo: unit === '%' ? 'Porcentaje' : 'Cantidad', numero: true, render: (fila) => formatoGrafica(fila._valor, unit) },
    ...(datos.some((fila) => fila.porcentaje !== undefined) && unit !== '%' ? [{ key: 'porcentaje', titulo: 'Porcentaje', numero: true, render: (fila) => formatoGrafica(fila.porcentaje, '%') }] : []),
  ];
  return (
    <MarcoGrafica titulo={titulo} subtitulo={subtitulo} ceja="Comparativa" acciones={acciones} nota={nota}
      resumen={{ valor: formatoGrafica(filas.length), etiqueta: labelKey === 'nombre_club' ? 'clubes' : 'categorías' }}
      detalle={<TablaGrafica titulo={titulo} columnas={columnas} filas={filas} />}>
      {cargando || !filas.length ? <EstadoGrafica cargando={cargando} mensaje={vacioMensaje} /> : <>
        <div className="grafica-unid__lienzo" style={{ height: alto }}>
          <ResponsiveContainer width="100%" height={alto} minWidth={0}>
            <BarChart data={visibles} layout="vertical" margin={{ top: 8, right: 58, left: 0, bottom: 0 }} accessibilityLayer>
              <CartesianGrid horizontal={false} stroke="var(--grafica-rejilla)" strokeDasharray="3 6" />
              <XAxis type="number" domain={[0, maximo]} axisLine={false} tickLine={false} tickCount={compacto ? 3 : 5}
                allowDecimals={unit === '%'} tick={{ fill: 'var(--grafica-atenuado)', fontSize: 11 }} tickFormatter={(valor) => formatoGrafica(valor, unit === '%' ? '%' : '')} />
              <YAxis dataKey={labelKey} type="category" width={compacto ? 96 : 154} axisLine={false} tickLine={false} interval={0}
                tick={<EtiquetaEje compacto={compacto} />} />
              <Tooltip content={<TooltipGrafica unidad={unit} />} cursor={{ fill: 'var(--grafica-cursor)', radius: 8 }} />
              <Bar dataKey="_valor" name={titulo} fill={color ?? COLORES_GRAFICA[0]} radius={[0, 5, 5, 0]} barSize={16} shape={<FormaBarra />} isAnimationActive={!reducirMovimiento}>
                <LabelList dataKey="_valor" content={<EtiquetaValor unidad={unit === '%' ? '%' : ''} />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ControlFilas total={filas.length} visibles={8} expandido={expandido} onToggle={() => setExpandido((valor) => !valor)} />
      </>}
    </MarcoGrafica>
  );
}
