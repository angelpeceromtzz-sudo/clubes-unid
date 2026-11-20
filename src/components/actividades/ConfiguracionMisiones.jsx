import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { misionesService } from '../../services/misiones.service';
import { DocumentoMisiones } from './DocumentoMisiones';
import { BotonAccion } from '../ui/BotonAccion';
import { BloqueEdicionActividad } from './BloqueEdicionActividad';
import { esFormatoMegamisiones } from '../../../shared/actividades';

export function ConfiguracionMisiones({ idActividad, configuracion, onChange, onCargando }) {
  const { inputCls, labelCls } = useTheme();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const cambiar = (clave, valor) => onChange({ ...configuracion, [clave]: valor });
  const cambiarProducto = (indice, cambios) => cambiar('productos', configuracion.productos.map((producto, posicion) => posicion === indice ? { ...producto, ...cambios } : producto));
  async function subir(archivo) {
    if (!archivo) return;
    setSubiendo(true); onCargando?.(true); setError('');
    try {
      if (archivo.size > 10 * 1024 * 1024 || archivo.type !== 'application/pdf') throw new Error('Selecciona un PDF de hasta 10 MB');
      const documento = await misionesService.subirCodigo(idActividad, archivo);
      cambiar('codigo_documento', documento.id_documento);
    } catch (fallo) { setError(fallo.message); }
    finally { setSubiendo(false); onCargando?.(false); }
  }
  return <div className="space-y-5">
    {esFormatoMegamisiones(configuracion) && <BloqueEdicionActividad titulo="Información del kit" descripcion="Describe lo que incluye esta edición. No se copian precios ni fechas de convocatorias anteriores.">
      <label className={labelCls}>Inclusiones y notas del kit<textarea className={inputCls} rows={3} maxLength={2000} value={configuracion.informacion_kit || ''} onChange={(evento) => cambiar('informacion_kit', evento.target.value)} placeholder="Por ejemplo, cuántas playeras incluye el kit de esta edición"/></label>
    </BloqueEdicionActividad>}
    <BloqueEdicionActividad titulo="Artículos promocionales" descripcion="Ofrece productos con precio y tallas disponibles. Los participantes podrán elegir cuáles adquirir.">
      <p className="text-sm">Los participantes podrán pedir artículos y ver el total en pesos mexicanos. El pago se realiza por fuera de la plataforma.</p>
      {configuracion.productos.map((producto, indice) => <fieldset key={producto.id_producto} className="rounded-xl border border-slate-400/25 p-3 space-y-3">
        <legend className="px-1 text-sm font-bold">Artículo {indice + 1}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelCls}>Nombre<input required maxLength={160} className={inputCls} value={producto.nombre} onChange={(evento) => cambiarProducto(indice, { nombre: evento.target.value })} /></label>
          <label className={labelCls}>Precio en MXN<input type="number" min={0} max={1000000} step="0.01" required={producto.activo} className={inputCls} value={producto.precio_centavos == null ? '' : producto.precio_centavos / 100} onChange={(evento) => cambiarProducto(indice, { precio_centavos: evento.target.value === '' ? null : Math.round(Number(evento.target.value) * 100) })} /></label>
        </div>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={producto.requiere_talla} onChange={(evento) => cambiarProducto(indice, { requiere_talla: evento.target.checked })} />Es una sudadera u otra prenda que requiere talla</label>
        {producto.requiere_talla && <label className={labelCls}>Tallas disponibles, una por línea<textarea className={inputCls} rows={3} value={producto.tallas.join('\n')} onChange={(evento) => cambiarProducto(indice, { tallas: evento.target.value.split('\n') })} onBlur={() => cambiarProducto(indice, { tallas: producto.tallas.map((talla) => talla.trim()).filter(Boolean) })} /></label>}
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={producto.activo} onChange={(evento) => cambiarProducto(indice, { activo: evento.target.checked })} />Disponible para nuevos pedidos</label>
        <BotonAccion variant="outline" size="sm" onClick={() => cambiar('productos', configuracion.productos.filter((_producto, posicion) => posicion !== indice))}>Quitar artículo</BotonAccion>
      </fieldset>)}
      <p className="text-sm">Solo ofrece playeras extra, sudaderas o gorras cuando hayas definido su precio y, si corresponde, sus tallas. Los artículos nuevos quedan sin disponibilidad hasta configurarlos.</p>
      <BotonAccion variant="outline" disabled={configuracion.productos.length >= 40} onClick={() => cambiar('productos', [...configuracion.productos, { id_producto: crypto.randomUUID(), nombre: '', precio_centavos: null, requiere_talla: false, tallas: [], activo: false }])}>Agregar artículo</BotonAccion>
    </BloqueEdicionActividad>
    <BloqueEdicionActividad titulo="Código de conducta" descripcion="Carga el documento original y decide si será obligatorio entregarlo firmado.">
      <p className="text-sm">Carga el documento original. El participante podrá descargarlo y adjuntar su PDF firmado electrónicamente.</p>
      <label className={labelCls}>PDF del código de conducta<input className={inputCls} type="file" accept="application/pdf,.pdf" disabled={subiendo} onChange={(evento) => { subir(evento.target.files?.[0]); evento.target.value = ''; }} /></label>
      {subiendo && <p role="status">Cargando PDF…</p>}
      <DocumentoMisiones id={configuracion.codigo_documento}>Revisar PDF cargado</DocumentoMisiones>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={configuracion.codigo_obligatorio} onChange={(evento) => cambiar('codigo_obligatorio', evento.target.checked)} />Exigir el PDF firmado para confirmar la inscripción</label>
      {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
    </BloqueEdicionActividad>
  </div>;
}
