/* Badge del estado editorial de una noticia (PBI-17).
   Traduce `status` a etiqueta + color; el motivo de rechazo va en el tooltip. */
import { Badge } from '../../ui/Badge';
import { COLORES_ESTADO, ETIQUETAS_CORTAS_ESTADO, DESCRIPCIONES_ESTADO } from '../../../constants/noticias';

export function BadgeEstadoNoticia({ estado, motivo = null, size = 'sm' }) {
  const etiqueta = ETIQUETAS_CORTAS_ESTADO[estado] || estado;
  const titulo = estado === 'rejected' && motivo
    ? `Motivo del rechazo: ${motivo}`
    : (DESCRIPCIONES_ESTADO[estado] || '');

  return (
    <span title={titulo} className="inline-block align-middle">
      <Badge texto={etiqueta} color={COLORES_ESTADO[estado] || 'slate'} size={size} />
    </span>
  );
}
