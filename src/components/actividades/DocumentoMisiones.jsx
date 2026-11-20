import { useState } from 'react';
import { misionesService } from '../../services/misiones.service';
import { BotonAccion } from '../ui/BotonAccion';

export function DocumentoMisiones({ id, acceso, children = 'Descargar código de conducta', nombre = 'codigo-conducta.pdf' }) {
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState('');
  if (!id) return null;
  async function descargar() {
    setPendiente(true); setError('');
    try {
      const archivo = await misionesService.descargarPdf(id, acceso);
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a'); enlace.href = url; enlace.download = nombre;
      document.body.append(enlace); enlace.click(); enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (fallo) { setError(fallo.message); }
    finally { setPendiente(false); }
  }
  return <div className="space-y-2"><BotonAccion variant="outline" size="sm" disabled={pendiente} onClick={descargar}>{pendiente ? 'Preparando PDF…' : children}</BotonAccion>{error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}</div>;
}
