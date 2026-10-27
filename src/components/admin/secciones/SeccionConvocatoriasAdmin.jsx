import { useEffect, useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { api } from '../../../services/api';
import { ModalConfiguracionConvocatoria } from '../../presidente/modales/ModalConfiguracionConvocatoria';
import { SeccionConvocatorias } from '../../presidente/secciones/SeccionConvocatorias';

export function SeccionConvocatoriasAdmin() {
  const { tema, inputCls } = useTheme();
  const [clubes, setClubes] = useState([]);
  const [idClub, setIdClub] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let activo = true;
    api.getClubes().then((lista) => { if (activo) setClubes(lista); }).catch((err) => { if (activo) setError(err.message); });
    return () => { activo = false; };
  }, []);
  const club = clubes.find((c) => String(c.id_club) === idClub);
  return <section className="max-w-5xl space-y-5">
    <header><h2 className={tema.title + ' text-xl font-bold'}>Revisión de convocatorias</h2><p className={tema.subtitle + ' mt-1 text-sm'}>Los presidentes crean las convocatorias. Coordinación VIVE (admin) las aprueba y publica o devuelve con observaciones.</p></header>
    <label className={tema.title + ' block text-xs font-semibold'}>Club<select aria-label="Seleccionar club para convocatorias" value={idClub} onChange={(e) => setIdClub(e.target.value)} className={inputCls + ' mt-2'}><option value="">Selecciona un club…</option>{clubes.map((c) => <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>)}</select></label>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    {club && <><ModalConfiguracionConvocatoria key={'config-' + club.id_club} club={club} /><SeccionConvocatorias key={club.id_club} club={club} /></>}
  </section>;
}
