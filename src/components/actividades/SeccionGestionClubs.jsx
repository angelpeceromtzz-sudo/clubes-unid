import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { GestionActividades } from '../../pages/GestionActividades';
import { BotonAccion } from '../ui/BotonAccion';

export function SeccionGestionClubs({ onVolver, children }) {
  const [parametros, setParametros] = useSearchParams();
  const { inputCls, labelCls } = useTheme();
  const tipo = (parametros.get('tipo_catalogo') || (parametros.get('seccion') === 'actividades' ? 'actividad' : 'club')) === 'actividad' ? 'actividad' : 'club';
  const registro = Number(parametros.get('registro'));
  const detalleClub = tipo === 'club' && Number.isInteger(registro) && registro > 0;

  function cambiarVista(nuevoTipo, id) {
    setParametros((actuales) => {
      const siguientes = new URLSearchParams(actuales);
      siguientes.set('seccion', 'clubes');
      siguientes.set('tipo_catalogo', nuevoTipo);
      for (const clave of ['registro', 'crear', 'tipo']) siguientes.delete(clave);
      if (id) siguientes.set('registro', id);
      return siguientes;
    }, { replace: true });
  }

  return <section aria-label="Gestión de Clubs" className="min-w-0 space-y-6">
    {tipo === 'actividad' ? <GestionActividades key="actividades" integrada tipoFijo="actividad"/> : detalleClub ? <>
      <BotonAccion variant="outline" onClick={() => { onVolver?.(); cambiarVista('club'); }}>Volver al listado de Clubs</BotonAccion>
      <GestionActividades key={'club-' + registro} integrada tipoFijo="club" soloDetalle/>
    </> : children({ onPublicacion: (club) => cambiarVista('club', club.id_club), tipo, onCambiarTipo: cambiarVista })}
  </section>;
}
