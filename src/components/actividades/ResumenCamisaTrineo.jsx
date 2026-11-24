const dinero = (centavos) => (centavos / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function ResumenCamisaTrineo({ pedido }) {
  if (pedido?.tipo !== 'camisa_trineo') return null;
  const camisa = pedido.lineas[0];

  return <section aria-label="Pedido de camisa del Trineo" className="space-y-2 rounded-xl border border-slate-400/25 p-4">
    <h4 className="font-bold">Camisa del Trineo</h4>
    <p className="text-sm">{camisa ? '1 camisa · Talla ' + camisa.talla : 'Sin pedido de camisa.'}</p>
    <p className="text-lg font-bold" aria-live="polite">Total: {dinero(pedido.total_centavos)} MXN</p>
    {camisa && <p className="text-sm">El pago se acuerda con el encargado.</p>}
  </section>;
}
