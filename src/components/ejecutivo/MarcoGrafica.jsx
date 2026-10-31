import { useId } from 'react';
import { Rectangle } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { formatoGrafica, lineasEtiqueta } from './graficas.utils';
import './graficas.css';

export function MarcoGrafica({ titulo, subtitulo, ceja, acciones, resumen, children, detalle, nota, className = '' }) {
  const { modoOscuro } = useTheme();
  const id = useId();
  return (
    <section className={`grafica-unid ${className}`} data-tema={modoOscuro ? 'oscuro' : 'claro'} aria-labelledby={`${id}-titulo`}>
      <header className="grafica-unid__cabecera">
        <div className="grafica-unid__encabezado">
          {ceja && <p className="grafica-unid__ceja"><span aria-hidden="true" />{ceja}</p>}
          <h3 id={`${id}-titulo`} className="grafica-unid__titulo">{titulo}</h3>
          {subtitulo && <p className="grafica-unid__subtitulo">{subtitulo}</p>}
        </div>
        {resumen && <div className="grafica-unid__resumen"><strong>{resumen.valor}</strong><span>{resumen.etiqueta}</span></div>}
        {acciones && <div className="grafica-unid__acciones">{acciones}</div>}
      </header>
      <div className="grafica-unid__contenido">{children}</div>
      {(nota || detalle) && <footer className="grafica-unid__pie">{nota && <p className="grafica-unid__nota">{nota}</p>}{detalle}</footer>}
    </section>
  );
}

export function EstadoGrafica({ cargando, mensaje = 'No hay datos disponibles para esta selección.' }) {
  return (
    <div className="grafica-unid__estado" role="status">
      {cargando ? <><div className="grafica-unid__esqueleto" aria-hidden="true"><i /><i /><i /></div><span>Cargando gráfica…</span></> : <><span className="grafica-unid__estado-marca" aria-hidden="true">—</span><p>{mensaje}</p></>}
    </div>
  );
}

export function LeyendaGrafica({ series }) {
  return <ul className="grafica-unid__leyenda" aria-label="Series de la gráfica">{series.map((serie) => <li key={serie.dataKey ?? serie.nombre}><span style={{ backgroundColor: serie.color }} aria-hidden="true" />{serie.nombre}</li>)}</ul>;
}

export function TooltipGrafica({ active, payload, label, unidad = '', children }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="grafica-unid__tooltip" role="status" aria-live="polite">
      <p className="grafica-unid__tooltip-titulo">{label ?? payload[0]?.payload?.nombre}</p>
      {children ?? payload.filter((item) => item.type !== 'none').map((item) => (
        <div className="grafica-unid__tooltip-fila" key={item.dataKey ?? item.name}>
          <span><i style={{ backgroundColor: item.color }} aria-hidden="true" />{item.name}</span>
          <strong>{formatoGrafica(item.value, unidad)}</strong>
        </div>
      ))}
    </div>
  );
}

export function EtiquetaEje({ x = 0, y = 0, payload, compacto = false }) {
  const nombre = String(payload?.value ?? '');
  const lineas = lineasEtiqueta(nombre, compacto ? 13 : 22, 3);
  return <text x={x - 8} y={y} textAnchor="end" fill="var(--grafica-texto-secundario)" fontSize={12}><title>{nombre}</title>{lineas.map((linea, indice) => <tspan key={indice} x={x - 8} dy={indice === 0 ? -(lineas.length - 1) * 7 : 14}>{linea}</tspan>)}</text>;
}

export function EtiquetaValor({ x = 0, y = 0, width = 0, height = 0, value, unidad = '' }) {
  if (value === null || value === undefined) return null;
  return <text x={Number(x) + Math.max(0, Number(width)) + 9} y={Number(y) + Number(height) / 2} fill="var(--grafica-texto)" fontSize={12} fontWeight={600} dominantBaseline="middle">{formatoGrafica(value, unidad)}</text>;
}

// Conserva las etiquetas de los valores cero sin dibujar una barra artificial.
export function FormaBarra({ width, height, ...props }) {
  if (!width || !height) return null;
  return <Rectangle {...props} width={width} height={height} />;
}

export function TablaGrafica({ titulo, columnas, filas }) {
  if (!filas.length) return null;
  return (
    <details className="grafica-unid__datos">
      <summary>Ver datos <span>{formatoGrafica(filas.length)} registros</span></summary>
      <div className="grafica-unid__tabla-contenedor" tabIndex={0} role="region" aria-label={`Datos de ${titulo}`}>
        <table className="grafica-unid__tabla">
          <caption className="sr-only">{titulo}</caption>
          <thead><tr>{columnas.map((columna) => <th key={columna.key} scope="col" className={columna.numero ? 'grafica-unid__numero' : undefined}>{columna.titulo}</th>)}</tr></thead>
          <tbody>{filas.map((fila, indice) => <tr key={fila.id ?? fila.clave ?? indice}>{columnas.map((columna) => <td key={columna.key} className={columna.numero ? 'grafica-unid__numero' : undefined}>{columna.render ? columna.render(fila) : fila[columna.key]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

export function ControlFilas({ total, visibles, expandido, onToggle }) {
  if (total <= visibles && !expandido) return null;
  return <div className="grafica-unid__control-filas"><span>{expandido ? total : visibles} de {total} categorías</span><button type="button" onClick={onToggle} aria-expanded={expandido}>{expandido ? 'Ver menos' : 'Ver todos'}</button></div>;
}
