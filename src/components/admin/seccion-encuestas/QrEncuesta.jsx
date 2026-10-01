/* Código QR de la encuesta, para compartir en impresos o pantalla.
 *
 * El QR se dibuja SIEMPRE con módulos oscuros sobre fondo blanco, también en
 * modo oscuro. Es contraintuitivo para la vista pero es lo que exige el
 * formato: los lectores reconstruyen la matriz leyendo el contraste
 * módulo/fondo, así que un QR "aclarado" para que combine con el tema oscuro
 * escanea peor o no escanea. El marco de alrededor sí lleva el color del tema.
 *
 * El SVG se usa para pantalla porque escala sin pérdida y se puede imprimir
 * vectorial. La descarga es un canvas aparte: al SVG no se le puede pedir un
 * dataURL, y un PNG es lo que se guarda en un cartel o se manda por WhatsApp.
 */
import { useRef } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../../contexts/ThemeContext';
import { Alerta } from '../../ui/Alerta';
import { BotonAccion } from '../../ui/BotonAccion';

const COLOR_MODULO = '#0e162c';
const COLOR_FONDO = '#ffffff';

// Por debajo de ~160px un QR en pantalla de teléfono no escanea confiablemente,
// que es justo cómo lo va a mirar el alumno.
const TAMANO = 176;
const NIVEL = 'M';
const ESCALA_DESCARGA = 4;

export function QrEncuesta({ enlace, titulo, slug }) {
  const { tema } = useTheme();
  const canvasRef = useRef(null);

  // El enlace se arma con window.location.origin, que en desarrollo es
  // localhost. Un QR de eso escanea perfecto en el propio teléfono y no abre
  // nada en el de al lado, así que el problema sólo aparece después de imprimir.
  // Por eso se dice en pantalla en vez de dejar que el admin lo descubra en un
  // cartel pegado en la facultad.
  const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(enlace);

  const descargar = () => {
    const origen = canvasRef.current;
    if (!origen) return;

    // Se reescala a un canvas propio en vez de usar el que ya está en pantalla:
    // un PNG de 176px sale borroso impreso en un cartel de medio metro.
    const grande = document.createElement('canvas');
    grande.width = TAMANO * ESCALA_DESCARGA;
    grande.height = TAMANO * ESCALA_DESCARGA;

    const ctx = grande.getContext('2d');
    ctx.fillStyle = COLOR_FONDO;
    ctx.fillRect(0, 0, grande.width, grande.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(origen, 0, 0, grande.width, grande.height);

    grande.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // El slug va en el nombre para que al descargarlo se sepa de qué encuesta
      // es, en vez de tener veinte archivos llamados qr.png.
      a.download = `qr-${slug || 'encuesta'}.png`;
      a.click();

      // createObjectURL no libera sola: sin esto el blob queda retenido en
      // memoria mientras se navega por el panel.
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <div className="mt-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-lg bg-white p-2">
          <QRCodeSVG
            value={enlace}
            size={TAMANO}
            level={NIVEL}
            bgColor={COLOR_FONDO}
            fgColor={COLOR_MODULO}
            marginSize={1}
            title={`Código QR de ${titulo}`}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p className={`text-[11px] ${tema.subtitle}`}>
            Para imprimir o proyectar. El alumno lo escanea con la cámara y abre la
            encuesta sin escribir nada.
          </p>

          <BotonAccion variant="outline" size="sm" onClick={descargar}>
            Descargar PNG
          </BotonAccion>

          {esLocal && (
            <Alerta tipo="warning" mensaje="Este QR apunta a localhost.">
              <p className="text-xs mt-1 opacity-80">
                Descargalo sólo para probar: escanea bien en este equipo, pero en el
                teléfono de cualquier otra persona no abrirá nada. Para uno que sí
                sirva hay que definir <code className="font-mono">VITE_PUBLIC_URL</code>{' '}
                con el dominio público y recompilar.
              </p>
            </Alerta>
          )}
        </div>
      </div>

      {/* Fuera de vista a propósito: este canvas existe sólo para poder exportar
          el PNG. Mostrarlo duplicaría el QR en pantalla sin agregar nada. */}
      <div className="hidden" aria-hidden="true">
        <QRCodeCanvas
          ref={canvasRef}
          value={enlace}
          size={TAMANO}
          level={NIVEL}
          bgColor={COLOR_FONDO}
          fgColor={COLOR_MODULO}
          marginSize={1}
        />
      </div>
    </div>
  );
}