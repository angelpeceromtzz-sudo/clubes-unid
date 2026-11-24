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

  return <section aria-label="Pedido de camisa del Trineo" className="space-y-3 rounded-xl border border-slate-400/25 p-4 shadow-[-4px_-4px_12px_rgba(0,0,0,0.08),4px_4px_12px_rgba(0,0,0,0.12)]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h4 className="font-bold">Camisa del Trineo</h4>
        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300">Pedido</span>
      </div>
      {campo && <SelectorCompraCamisa campo={campo} valor={valor} onChange={onChange} />}
    </div>
    <hr className="border-slate-400/15" />
    {campo && <p className="text-xs">Selecciona la talla que necesitas.</p>}
    {camisa && <><p className="text-sm">1 camisa · Talla {camisa.talla}</p><p className="text-lg font-bold" aria-live="polite">Total: {dinero(pedido.total_centavos)} MXN</p><p className="text-sm">El pago se acuerda con el encargado.</p></>}
    <img src="/actividades/trineo-suenos-3.jpg" alt="Camisa del Trineo" className="h-32 w-full rounded-lg object-cover shadow-md sm:h-40" loading="lazy" />
  </section>;
}
