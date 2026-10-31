import { useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { MarcoGrafica, EstadoGrafica, TooltipGrafica, LeyendaGrafica, TablaGrafica, EtiquetaEje, EtiquetaValor, ControlFilas, FormaBarra } from './MarcoGrafica';
import { formatoGrafica, prepararOcupacion } from './graficas.utils';

function TooltipOcupacion({ active, payload, label }) {
  const fila = payload?.[0]?.payload;
  return <TooltipGrafica active={active} payload={payload} label={label}>
    {fila && <>
      <div className="grafica-unid__tooltip-fila"><span>Ocupación</span><strong>{formatoGrafica(fila.porcentaje, '%')}</strong></div>
      <div className="grafica-unid__tooltip-fila"><span>Integrantes / cupo</span><strong>{formatoGrafica(fila.ocupado)} / {formatoGrafica(fila.cupo)}</strong></div>
      <p className="grafica-unid__tooltip-nota">{fila.exceso > 0 ? formatoGrafica(fila.exceso) + ' por encima del cupo' : formatoGrafica(fila.disponible) + ' plazas disponibles'}</p>
    </>}
  </TooltipGrafica>;
}

export function GraficaOcupacionApilada({ titulo, subtitulo, datos = [], cargando, vacioMensaje = 'Sin datos disponibles.' }) {
  const compacto = useMediaQuery('(max-width: 639px)');
  const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [expandido, setExpandido] = useState(false);
  const filas = prepararOcupacion(datos);
  const visibles = expandido ? filas : filas.slice(0, 8);
  const alto = Math.max(240, visibles.length * (compacto ? 66 : 58) + 35);
  const columnas = [
    { key: 'nombre_club', titulo: 'Club' },
    { key: 'ocupado', titulo: 'Integrantes', numero: true, render: (fila) => formatoGrafica(fila.ocupado) },
    { key: 'cupo', titulo: 'Cupo', numero: true, render: (fila) => formatoGrafica(fila.cupo) },
    { key: 'porcentaje', titulo: 'Ocupación', numero: true, render: (fila) => formatoGrafica(fila.porcentaje, '%') },
  ];
  return (
    <MarcoGrafica titulo={titulo} subtitulo={subtitulo} ceja="Capacidad" resumen={{ valor: formatoGrafica(filas.length), etiqueta: filas.length === 1 ? 'club' : 'clubes' }}
      nota={filas.some((fila) => fila.exceso > 0) ? 'Hay clubes por encima del cupo. La etiqueta muestra su ocupación real.' : undefined}
      detalle={<TablaGrafica titulo={titulo} columnas={columnas} filas={filas} />}>
      {cargando || !filas.length ? <EstadoGrafica cargando={cargando} mensaje={vacioMensaje} /> : <>
        <LeyendaGrafica series={[{ nombre: 'Plazas ocupadas', color: 'var(--grafica-ambar)' }, { nombre: 'Disponibles', color: 'var(--grafica-disponible)' }]} />
        <div className="grafica-unid__lienzo" style={{ height: alto }}>
          <ResponsiveContainer width="100%" height={alto} minWidth={0}>
            <BarChart data={visibles} layout="vertical" margin={{ top: 8, right: 62, left: 0, bottom: 0 }} accessibilityLayer>
              <CartesianGrid horizontal={false} stroke="var(--grafica-rejilla)" strokeDasharray="3 6" />
              <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false}
                tick={{ fill: 'var(--grafica-atenuado)', fontSize: 11 }} tickFormatter={(valor) => valor + '%'} minTickGap={compacto ? 24 : 8} />
              <YAxis dataKey="nombre_club" type="category" width={compacto ? 96 : 154} axisLine={false} tickLine={false} interval={0}
                tick={<EtiquetaEje compacto={compacto} />} />
              <Tooltip content={<TooltipOcupacion />} cursor={{ fill: 'var(--grafica-cursor)', radius: 8 }} />
              <Bar dataKey="porcentajeOcupado" name="Ocupados" stackId="cupo" fill="var(--grafica-ambar)" radius={[5, 0, 0, 5]} barSize={16} isAnimationActive={!reducirMovimiento} />
              <Bar dataKey="porcentajeDisponible" name="Disponibles" stackId="cupo" fill="var(--grafica-disponible)" radius={[0, 5, 5, 0]} barSize={16} shape={<FormaBarra />} isAnimationActive={!reducirMovimiento}>
                <LabelList dataKey="porcentaje" content={<EtiquetaValor unidad="%" />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ControlFilas total={filas.length} visibles={8} expandido={expandido} onToggle={() => setExpandido((valor) => !valor)} />
      </>}
    </MarcoGrafica>
  );
}
