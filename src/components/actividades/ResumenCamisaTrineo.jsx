import { SelectorOpciones } from '../ui/SelectorOpciones';

const dinero = (centavos) => (centavos / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function SelectorCompraCamisa({ campo, valor, onChange }) {
  return <section aria-label="Compra de camisa del Trineo" className="space-y-3 rounded-xl border border-slate-400/25 p-4">
    <h4 className="font-bold">Compra de camisa</h4>
    <p className="text-sm">Selecciona la talla de la camisa que necesitas.</p>
    <SelectorOpciones
      id="talla-compra-camisa"
      name="talla_compra_camisa"
      etiqueta="Talla de camisa"
      valor={valor || ''}
      alCambiar={onChange}
      required
      opciones={[{ value: '', label: 'Selecciona una talla' }, ...(campo?.opciones || []).map((opcion) => ({ value: opcion, label: opcion }))]}
      botonClassName="h-11"
    />
  </section>;
}

export function ResumenCamisaTrineo({ pedido }) {
  if (pedido?.tipo !== 'camisa_trineo') return null;
  const camisa = pedido.lineas[0];
  if (!camisa) return null;

  return <section aria-label="Pedido de camisa del Trineo" className="space-y-2 rounded-xl border border-slate-400/25 p-4">
    <h4 className="font-bold">Camisa del Trineo</h4>
     <p className="text-sm">1 camisa · Talla {camisa.talla}</p>
    <p className="text-lg font-bold" aria-live="polite">Total: {dinero(pedido.total_centavos)} MXN</p>
    {camisa && <p className="text-sm">El pago se acuerda con el encargado.</p>}
  </section>;
}
