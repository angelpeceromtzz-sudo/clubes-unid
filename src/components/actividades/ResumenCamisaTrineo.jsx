import { SelectorOpciones } from '../ui/SelectorOpciones';

const dinero = (centavos) => (centavos / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function SelectorCompraCamisa({ campo, valor, onChange }) {
  return <SelectorOpciones
      id="talla-compra-camisa"
      name="talla_compra_camisa"
      etiqueta="Talla de camisa"
      valor={valor || ''}
      alCambiar={onChange}
      required
      opciones={[{ value: '', label: 'Selecciona una talla' }, ...(campo?.opciones || []).map((opcion) => ({ value: opcion, label: opcion }))]}
      className="ml-auto w-full max-w-sm"
      botonClassName="h-11 text-base"
    />;
}

export function ResumenCamisaTrineo({ pedido, campo, valor, onChange }) {
  if (pedido?.tipo !== 'camisa_trineo' && !campo) return null;
  const camisa = pedido?.lineas?.[0];

  return <section aria-label="Pedido de camisa del Trineo" className="space-y-2 rounded-xl border border-slate-400/25 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="font-bold">Camisa del Trineo</h4>
      {campo && <SelectorCompraCamisa campo={campo} valor={valor} onChange={onChange} />}
    </div>
    {campo && <p className="text-xs">Selecciona la talla que necesitas.</p>}
    {camisa && <><p className="text-sm">1 camisa · Talla {camisa.talla}</p><p className="text-lg font-bold" aria-live="polite">Total: {dinero(pedido.total_centavos)} MXN</p><p className="text-sm">El pago se acuerda con el encargado.</p></>}
  </section>;
}
