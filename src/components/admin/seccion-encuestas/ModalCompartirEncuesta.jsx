/* Diálogo de Compartir: enlace público, copiar y código QR.
 *
 * Antes el enlace, el botón de copiar y el QR vivían en un bloque permanente
 * al principio del editor. Eso hacía que lo primero que se viera al abrir una
 * encuesta fuera un input con una URL larga, por encima de las preguntas, que
 * es lo único que el admin viene a hacer. Ahora el bloque se abre a propósito,
 * desde la acción "Compartir", y cierra con la explicación de si ese enlace
 * responde ahora o no.
 *
 * La lógica del enlace no cambia: la URL la arma `enlacePublicoEncuesta` y el
 * QR la dibuja `QrEncuesta`. Lo que se agrega es el estado: un enlace de una
 * encuesta en borrador o cerrada no sirve para repartirlo, y decirlo es
 * mejor que dejar que el admin lo descubra cuando el alumno abre el QR.
 */
import { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { Badge } from '../../ui/Badge';
import { BotonAccion } from '../../ui/BotonAccion';
import { Icono } from '../../ui/Icono';
import { ModalBase } from '../../ui/ModalBase';
import { enlacePublicoEncuesta, estadoEnlaceEncuesta } from '../../../utils/encuesta';
import { QrEncuesta } from './QrEncuesta';

export function ModalCompartirEncuesta({ encuesta, onClose }) {
  const { tema, inputCls } = useTheme();

  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState(null);
  const [verQr, setVerQr] = useState(false);

  const enlace = enlacePublicoEncuesta(encuesta?.slug);
  const estado = estadoEnlaceEncuesta(encuesta);

  const copiar = async () => {
    setErrorCopia(null);

    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin https o sin permiso el portapapeles falla. No es motivo para
      // romper la pantalla: el enlace está en pantalla y se puede copiar a
      // mano, pero sí hay que decirlo.
      setCopiado(false);
      setErrorCopia(
        'No se pudo copiar al portapapeles. El enlace está arriba: se puede seleccionar y copiar a mano.'
      );
    }
  };

  return (
    <ModalBase show onClose={onClose} maxWidth="max-w-xl" closeOnBackdrop={false} externalClose>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className={`text-lg font-black uppercase tracking-wider ${tema.title}`}>
          Compartir
        </h3>
        <Badge texto={estado.etiqueta} color={estado.color} />
      </div>

      {/* El estado primero: es lo que decide si este enlace sirve para
          repartirlo ahora o no. */}
      <Alerta tipo={estado.respondible ? 'success' : 'info'} mensaje={estado.detalle} />

      <div className="mt-5 space-y-3">
        <label
          htmlFor="enlace-publico-encuesta"
          className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5"
        >
          Enlace público
        </label>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            id="enlace-publico-encuesta"
            readOnly
            value={enlace}
            aria-label="Enlace público de la encuesta"
            className={`${inputCls} text-xs flex-1 min-w-0 cursor-text`}
            onFocus={(e) => e.target.select()}
          />

          <BotonAccion variant="outline" size="sm" onClick={copiar}>
            <Icono nombre={copiado ? 'check' : 'clipboard'} className="h-3.5 w-3.5" />
            {copiado ? 'Copiado' : 'Copiar'}
          </BotonAccion>

          <BotonAccion
            variant="outline"
            size="sm"
            onClick={() => setVerQr((v) => !v)}
            aria-expanded={verQr}
          >
            <Icono nombre="grid" className="h-3.5 w-3.5" />
            {verQr ? 'Ocultar QR' : 'QR'}
          </BotonAccion>
        </div>

        {copiado && (
          <p className="text-[11px] text-emerald-400 font-semibold" role="status">
            Enlace copiado al portapapeles.
          </p>
        )}

        {errorCopia && (
          <p className="text-[11px] text-red-400 font-semibold" role="alert">
            {errorCopia}
          </p>
        )}

        {verQr && (
          <QrEncuesta enlace={enlace} titulo={encuesta?.titulo} slug={encuesta?.slug} />
        )}
      </div>

      <p className={`text-[11px] mt-5 ${tema.subtitle}`}>
        El enlace es público y no pide sesión. Las respuestas son anónimas: la
        encuesta guarda sólo el programa que el alumno elige, nunca su nombre ni
        su matrícula.
      </p>
    </ModalBase>
  );
}
