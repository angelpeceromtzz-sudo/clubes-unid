import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';
import { Spinner } from '../../ui/Spinner';
import { EmptyState } from '../../ui/EmptyState';
import { Alerta } from '../../ui/Alerta';
import { ModalConfirmacion } from '../../ui/ModalConfirmacion';
import { EncabezadoPagina } from '../../ui/EncabezadoPagina';
import { MiembroCard } from '../miembros/MiembroCard';
import { ModalVP } from '../miembros/ModalVP';

export function VistaMiembros({ club, esPresidente, onActualizarClub }) {
  const { tema, modoOscuro } = useTheme();
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [asignando, setAsignando] = useState(null);
  const [modalVP, setModalVP] = useState(null);
  const [miembroABajar, setMiembroABajar] = useState(null);

  useEffect(() => {
    let montado = true;
    async function cargar() {
      setError('');
      try {
        const data = await api.getMiembros(club.id_club);
        if (montado) setMiembros(data);
      } catch (err) {
        if (montado) setError(err.message);
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargar();
    return () => { montado = false; };
  }, [club.id_club]);

  async function confirmarBajarMiembro() {
    const usuario = miembroABajar;
    setMiembroABajar(null);
    try {
      await api.bajarMiembro(usuario.id_usuario);
      setMiembros((prev) => prev.filter((m) => m.id_usuario !== usuario.id_usuario));
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmarVP() {
    if (!modalVP) return;
    const { usuario, accion } = modalVP;
    const esQuitar = accion === 'quitar';
    setAsignando(usuario.id_usuario);
    setModalVP(null);
    try {
      const result = await api.updateVicepresidente(club.id_club, esQuitar ? null : usuario.id_usuario);
      if (onActualizarClub) onActualizarClub({ id_vicepresidente: result.id_vicepresidente });
    } catch (err) {
      setError(err.message);
    } finally {
      setAsignando(null);
    }
  }

  if (cargando) return <Spinner />;

  const tieneVP = club.id_vicepresidente != null;

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Miembros del Club"
        subtitulo={`${miembros.length} miembro(s) activo(s) en ${club.nombre_club}`}
      />
      {error && <Alerta tipo="error" mensaje={error} />}

      {miembros.length === 0 ? (
        <EmptyState icono="users" titulo="Sin miembros" descripcion="Aún no hay miembros inscritos en este club." />
      ) : (
        <div className="space-y-2">
          {miembros.map((m) => (
            <MiembroCard
              key={m.id_usuario}
              miembro={m}
              club={club}
              esPresidente={esPresidente}
              tieneVP={tieneVP}
              asignando={asignando}
              onAsignarVP={(usuario, accion) => setModalVP({ usuario, accion })}
              onExpulsar={(usuario) => setMiembroABajar(usuario)}
              modoOscuro={modoOscuro}
              tema={tema}
            />
          ))}
        </div>
      )}

      <ModalVP modalVP={modalVP} modoOscuro={modoOscuro} tema={tema} onClose={() => setModalVP(null)} onConfirm={confirmarVP} />
      <ModalConfirmacion
        show={!!miembroABajar}
        titulo="Expulsar del club"
        mensaje={miembroABajar ? `¿Expulsar a ${miembroABajar.nombre_completo} del club?` : ''}
        textoConfirmar="Expulsar"
        varianteDanger
        onConfirmar={confirmarBajarMiembro}
        onCancelar={() => setMiembroABajar(null)}
      />
    </div>
  );
}
