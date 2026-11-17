import { MisActividadesPanel } from '../components/actividades/MisActividadesPanel';
import { useTheme } from '../contexts/ThemeContext';
import { CatalogoActividades, NavegacionActividades } from '../components/actividades/ActividadUI';
import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../contexts/AuthContext';

export function PaginaActividades() {
  const { tema } = useTheme();
  return <main className="max-w-7xl mx-auto px-6 py-10 space-y-9">
    <div><NavegacionActividades /><h1 className={'text-3xl sm:text-4xl font-black ' + tema.title}>Actividades</h1><p className={'mt-3 max-w-2xl ' + tema.subtitle}>Encuentra nuevas formas de participar, compartir y vivir tu universidad.</p></div>
    <CatalogoActividades soloDestacadas />
    <section className="space-y-5"><h2 className={'text-2xl font-black ' + tema.title}>Conoce nuestra oferta</h2><CatalogoActividades /></section>
  </main>;
}

export function MisActividades({ onLoginClick }) {
  const {usuario}=useAutenticacion();
  if(usuario && usuario.id_rol!==1) return <Navigate to="/panel" replace/>;
  return <main className="max-w-5xl mx-auto px-6 py-10"><NavegacionActividades/><MisActividadesPanel onLoginClick={onLoginClick}/></main>;
}
