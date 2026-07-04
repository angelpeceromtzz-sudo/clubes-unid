import { Badge } from '../ui/Badge';
import { useTheme } from '../../contexts/ThemeContext';
import { Spinner } from '../ui/Spinner';
import { Th, Td } from '../ui/CeldasTabla';

export function SeccionClubes({ clubesDetalle, cargando }) {
  const { modoOscuro } = useTheme();
  if (cargando) {
    return <Spinner className="py-20" />;
  }

  const estatusColor = (estatus) => {
    const map = { activo: 'emerald', proximamente: 'amber', inactivo: 'red' };
    return map[estatus] || 'slate';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${modoOscuro ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <Th>Club</Th>
            <Th>Presidente</Th>
            <Th>Lugar</Th>
            <Th>Cupo</Th>
            <Th>Ocupado</Th>
            <Th>Estatus</Th>
          </tr>
        </thead>
        <tbody>
          {clubesDetalle.length === 0 && (
            <tr><td colSpan={6} className="text-center py-10 text-slate-500">No hay clubes registrados</td></tr>
          )}
          {clubesDetalle.map(c => (
            <tr key={c.id_club} className={`border-b ${modoOscuro ? 'border-slate-800/50 hover:bg-slate-800/20' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
              <Td>
                <p className="font-medium">{c.nombre_club}</p>
                <p className="text-xs text-slate-500">{c.categoria}</p>
              </Td>
              <Td>{c.presidente}</Td>
              <Td>{c.lugar || '—'}</Td>
              <Td className="font-mono">{c.cupo_maximo}</Td>
              <Td className="font-mono">{c.cupo_ocupado}</Td>
              <Td><Badge texto={c.estatus} color={estatusColor(c.estatus)} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
