import { ModalBase } from '../ui/ModalBase';
import { Icono } from '../ui/Icono';
import { useDialogoCalendario } from '../../hooks/useDialogoCalendario';
import { QrMural } from './QrMural';

export function ModalCompartirMural({ onClose }) {
  const ref = useDialogoCalendario(onClose);
  return <ModalBase show onClose={onClose}><div ref={ref} role="dialog" aria-modal="true" aria-label="Código QR del mural"><div className="mb-3 flex justify-end"><button type="button" onClick={onClose} aria-label="Cerrar código QR" className="p-2 cursor-pointer"><Icono nombre="close" /></button></div><QrMural /></div></ModalBase>;
}
