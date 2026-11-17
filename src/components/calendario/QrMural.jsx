import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../contexts/ThemeContext';
import { muralService } from '../../services/mural.service';
import { enlaceMural } from '../../utils/mural';

export function QrMural({ editable = false }) {
  const { tema, inputCls, cardCls } = useTheme();
  const sugerido = enlaceMural(import.meta.env.VITE_PUBLIC_URL || window.location.origin);
  const [enlace, setEnlace] = useState(sugerido);
  const [direccion, setDireccion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  useEffect(() => {
    let activo = true;
    muralService.configuracion().then((config) => {
      if (!activo) return;
      setEnlace(enlaceMural(config.url_publica) || sugerido);
      setDireccion(config.url_publica || '');
    }).catch(() => { if (activo) setError('No se pudo consultar la dirección guardada. Recarga antes de imprimir el QR.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [sugerido]);
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(enlace);
  const pendiente = editable && (enlaceMural(direccion || sugerido) !== enlace);

  async function guardar(evento) {
    evento.preventDefault();
    setError(''); setMensaje('');
    if (direccion.trim() && (!enlaceMural(direccion.trim()) || direccion.trim().length > 2048)) { setError('Escribe una dirección http o https válida.'); return; }
    setGuardando(true);
    try {
      const config = await muralService.guardarConfiguracion(direccion.trim() || null);
      setEnlace(enlaceMural(config.url_publica) || sugerido);
      setDireccion(config.url_publica || '');
      setMensaje('Dirección guardada. El QR ya está actualizado.');
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  }
  function descargar(blob, nombre) {
    if (!blob) { setError('No se pudo generar el archivo.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(enlace); setMensaje('Enlace copiado.'); }
    catch { setError('No se pudo copiar. Selecciona la dirección que aparece debajo del QR.'); }
  }
  const boton = `rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer disabled:opacity-40 ${cardCls}`;
  return (
    <section aria-label="Compartir el mural digital" className="space-y-4">
      <div><h3 className={`text-base font-bold ${tema.title}`}>El mural, al alcance de una cámara</h3><p className={`mt-1 text-xs leading-relaxed ${tema.subtitle}`}>Escanea para abrir el mural digital sin iniciar sesión. El mismo QR sirve aunque cambien las publicaciones.</p></div>
      {editable && <form onSubmit={guardar} className="space-y-2"><label className={`block text-xs font-semibold ${tema.title}`}>Dirección pública del sitio<input type="url" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder={sugerido} maxLength={2048} className={`${inputCls} mt-2`} disabled={cargando || guardando} /></label><p className={`text-[11px] ${tema.subtitle}`}>Usa el dominio donde publicaste la aplicación. Se abrirá directamente el mural.</p><button type="submit" disabled={cargando || guardando} className={boton}>{guardando ? 'Guardando…' : 'Guardar dirección del QR'}</button></form>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      {mensaje && <p role="status" className="text-xs text-emerald-600">{mensaje}</p>}
      {cargando ? <p className={`text-xs ${tema.subtitle}`}>Cargando dirección del mural…</p> : <>
        <div ref={svgRef} className="mx-auto w-fit rounded-xl bg-white p-3"><QRCodeSVG value={enlace} size={208} marginSize={4} level="M" bgColor="#ffffff" fgColor="#0e162c" title="Escanea para abrir el mural digital UNID" /></div>
        <p className={`break-all text-center text-xs ${tema.subtitle}`}><a href={enlace} target="_blank" rel="noopener noreferrer" className="underline">{enlace}</a></p>
        {local && <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-600">Este QR apunta a esta computadora (localhost). Para abrirlo desde un teléfono, configura el dominio público del sitio.</p>}
        {pendiente && <p className={`text-xs ${tema.subtitle}`}>Guarda la nueva dirección para actualizar y descargar el QR.</p>}
        <div className="flex flex-wrap justify-center gap-2"><button type="button" disabled={pendiente || !!error} onClick={() => canvasRef.current?.toBlob((blob) => descargar(blob, 'mural-unid-qr.png'), 'image/png')} className={boton}>Descargar PNG</button><button type="button" disabled={pendiente || !!error} onClick={() => descargar(new Blob([new XMLSerializer().serializeToString(svgRef.current.querySelector('svg'))], { type: 'image/svg+xml;charset=utf-8' }), 'mural-unid-qr.svg')} className={boton}>Descargar SVG</button><button type="button" onClick={copiar} className={boton}>Copiar enlace</button></div>
        <div className="hidden" aria-hidden="true"><QRCodeCanvas ref={canvasRef} value={enlace} size={1024} marginSize={4} level="M" bgColor="#ffffff" fgColor="#0e162c" /></div>
      </>}
    </section>
  );
}
