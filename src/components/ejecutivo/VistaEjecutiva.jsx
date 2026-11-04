/* Vista ejecutiva compartida para Administración y Rectoría. */
import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileText, LoaderCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { descargarExcelEjecutivo } from '../../services/exportaciones.service';
import { Spinner } from '../ui/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeccionResumen } from './SeccionResumen';
import { SeccionClubes } from './SeccionClubes';
import { SeccionAsistencia } from './SeccionAsistencia';
import { SeccionEncuestas } from './SeccionEncuestas';
import { SeccionPostulaciones } from './SeccionPostulaciones';
import { formatearFecha } from '../../utils/formatoDashboard';
import { crearReportePDF, nombreArchivoReporte, TITULOS_REPORTE } from './exportaciones.utils';

export function VistaEjecutiva({ d }) {
  const { modoOscuro, cardCls } = useTheme();
  const [tab, setTab] = useState('resumen');
  const [exportando, setExportando] = useState('');
  const [aviso, setAviso] = useState(null);
  const descargaEnCurso = useRef(false);

  async function exportar(formato) {
    if (descargaEnCurso.current) return;
    descargaEnCurso.current = true;
    setExportando(formato);
    setAviso(null);
    try {
      if (formato === 'excel') {
        await descargarExcelEjecutivo(d.filtros);
      } else {
        const reporte = crearReportePDF(d, tab);
        const { generarPDF } = await import('./exportarPDF');
        await generarPDF(reporte).save(nombreArchivoReporte('pdf', tab), { returnPromise: true });
      }
      setAviso({ tipo: 'exito', texto: `${formato === 'excel' ? 'Excel' : 'PDF'} listo. Se inició la descarga.` });
    } catch (error) {
      console.error('Error al exportar estadísticas:', error);
      setAviso({ tipo: 'error', texto: formato === 'excel' ? error.message : 'No se pudo generar el PDF. Inténtalo de nuevo.' });
    } finally {
      descargaEnCurso.current = false;
      setExportando('');
    }
  }

  if (d.cargando) return <Spinner className="py-32" />;
  if (d.error) return (
    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
      <p className="text-sm text-red-400 font-medium">{d.error}</p>
    </div>
  );

  const subtextoCls = modoOscuro ? 'text-slate-400' : 'text-slate-500';
  const botonBase = 'group flex min-h-16 min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none';
  const pdfPendiente = tab === 'encuestas' && d.cargandoResultados;
  const IconoAviso = aviso?.tipo === 'error' ? AlertCircle : CheckCircle2;

  return (
    <div className="space-y-6">
      <div className={`${cardCls} border rounded-2xl p-4 sm:p-5`}>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div className="min-w-0">
            <h2 className={`text-lg font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Vista ejecutiva</h2>
            <p className={`mt-1 text-xs ${subtextoCls}`}>
              {d.actualizadoEn ? `Actualizado: ${formatearFecha(d.actualizadoEn)}` : 'Sin fecha de actualización'}
            </p>
            <p className={`mt-2 text-xs leading-relaxed ${subtextoCls}`}>Descarga las estadísticas con los filtros aplicados.</p>
          </div>
          <div role="group" aria-label="Exportar estadísticas" className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3 xl:min-w-[440px]">
            <button type="button" onClick={() => exportar('excel')} disabled={Boolean(exportando)} aria-busy={exportando === 'excel'}
              aria-label={exportando === 'excel' ? 'Preparando Excel' : 'Exportar Excel: todas las secciones'}
              className={`${botonBase} focus-visible:ring-emerald-500 ${modoOscuro ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/50 focus-visible:ring-offset-[#0e162c]' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 focus-visible:ring-offset-white'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${modoOscuro ? 'bg-emerald-500/15' : 'bg-white'}`}>
                {exportando === 'excel' ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <FileSpreadsheet aria-hidden="true" className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{exportando === 'excel' ? 'Preparando…' : 'Exportar Excel'}</span>
                <span className={`block mt-0.5 text-[11px] ${subtextoCls}`}>Todas las secciones</span>
              </span>
              <Download aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
            </button>
            <button type="button" onClick={() => exportar('pdf')} disabled={Boolean(exportando) || pdfPendiente} aria-busy={exportando === 'pdf'}
              aria-label={exportando === 'pdf' ? 'Preparando PDF' : `Exportar PDF: ${TITULOS_REPORTE[tab]}`}
              title={pdfPendiente ? 'Espera a que terminen de cargar los resultados de la encuesta.' : `Descargar la pestaña ${TITULOS_REPORTE[tab]}`}
              className={`${botonBase} focus-visible:ring-rose-500 ${modoOscuro ? 'bg-rose-500/10 border-rose-500/25 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400/50 focus-visible:ring-offset-[#0e162c]' : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 hover:border-rose-400 focus-visible:ring-offset-white'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${modoOscuro ? 'bg-rose-500/15' : 'bg-white'}`}>
                {exportando === 'pdf' ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <FileText aria-hidden="true" className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">{exportando === 'pdf' ? 'Preparando…' : 'Exportar PDF'}</span>
                <span className={`block mt-0.5 text-[11px] ${subtextoCls}`}>{TITULOS_REPORTE[tab]}</span>
              </span>
              <Download aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
            </button>
          </div>
        </div>
        <div aria-live="polite" aria-atomic="true">
          {(exportando || aviso) && <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${aviso?.tipo === 'error' ? (modoOscuro ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-700') : subtextoCls}`}>
            {exportando ? <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" /> : <IconoAviso aria-hidden="true" className="h-4 w-4 shrink-0" />}
            <span>{exportando ? `Preparando ${exportando === 'excel' ? 'Excel con todas las secciones' : `PDF de ${TITULOS_REPORTE[tab]}`}…` : aviso.texto}</span>
          </div>}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(valor) => { setTab(valor); setAviso(null); }} className="w-full">
        <TabsList aria-label="Secciones de estadísticas" className={`flex h-auto! w-full! justify-start! gap-1 overflow-x-auto rounded-xl! border p-1.5! ${modoOscuro ? 'bg-slate-900/60 border-slate-700/50' : 'bg-slate-100 border-slate-200'}`}>
          {Object.keys(TITULOS_REPORTE).map((clave) => <TabsTrigger key={clave} value={clave} disabled={Boolean(exportando)}
            className={`min-h-10 shrink-0 px-4! py-2! text-xs! font-semibold! transition-colors ${modoOscuro ? 'text-slate-400! hover:text-white! data-active:bg-slate-700! data-active:text-white!' : 'text-slate-600! hover:text-slate-900! data-active:bg-white! data-active:text-slate-900!'}`}>
            {clave === 'resumen' ? 'Resumen' : TITULOS_REPORTE[clave]}
          </TabsTrigger>)}
        </TabsList>
        <TabsContent value="resumen" className="mt-6"><SeccionResumen d={d} /></TabsContent>
        <TabsContent value="clubes" className="mt-6"><SeccionClubes d={d} /></TabsContent>
        <TabsContent value="asistencia" className="mt-6"><SeccionAsistencia d={d} /></TabsContent>
        <TabsContent value="encuestas" className="mt-6"><SeccionEncuestas d={d} /></TabsContent>
        <TabsContent value="postulaciones" className="mt-6"><SeccionPostulaciones d={d} /></TabsContent>
      </Tabs>
    </div>
  );
}
