/* Vista ejecutiva compartida para Administración y Rectoría. */
import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE, getToken } from '../../services/api-core';
import { BotonAccion } from '../ui/BotonAccion';
import { Spinner } from '../ui/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeccionResumen } from './SeccionResumen';
import { SeccionClubes } from './SeccionClubes';
import { SeccionAsistencia } from './SeccionAsistencia';
import { SeccionEncuestas } from './SeccionEncuestas';
import { SeccionPostulaciones } from './SeccionPostulaciones';
import { formatearFecha } from '../../utils/formatoDashboard';

function descargarExcel(filtros) {
  const params = new URLSearchParams({ formato: 'xlsx' });
  if (filtros.id_club) params.set('id_club', filtros.id_club);
  if (filtros.id_periodo) params.set('id_periodo', filtros.id_periodo);
  if (filtros.carrera) params.set('carrera', filtros.carrera);
  if (filtros.estado) params.set('estado', filtros.estado);

  fetch(`${API_BASE}/estadisticas/ejecutivo/exportar?${params.toString()}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ejecutivo_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch((err) => {
      console.error(err);
      alert('No se pudo descargar el archivo');
    });
}

function textoFiltros(filtros, listas) {
  const partes = [];
  if (filtros.id_club) {
    const club = listas.clubes.find((c) => String(c.id_club) === String(filtros.id_club));
    partes.push(`Club: ${club?.nombre_club ?? filtros.id_club}`);
  }
  if (filtros.id_periodo) {
    const periodo = listas.periodos.find((p) => String(p.id_periodo) === String(filtros.id_periodo));
    partes.push(`Periodo: ${periodo?.nombre ?? filtros.id_periodo}`);
  }
  if (filtros.carrera) {
    const lic = listas.licenciaturas.find((l) => String(l.id_licenciatura) === String(filtros.carrera));
    partes.push(`Licenciatura: ${lic?.nombre ?? filtros.carrera}`);
  }
  if (filtros.estado) partes.push(`Estado: ${filtros.estado}`);
  return partes.length ? partes.join(' · ') : 'Sin filtros';
}

async function exportarPDF(titulo, filtros, listas) {
  const elementoActivo = document.querySelector('[data-slot="tabs-content"]:not([hidden])');
  if (!elementoActivo) return;
  const contenedor = document.createElement('div');
  contenedor.style.position = 'fixed';
  contenedor.style.left = '-9999px';
  contenedor.style.top = '0';
  contenedor.style.width = '1200px';
  contenedor.style.padding = '24px';
  contenedor.style.background = '#ffffff';
  contenedor.style.color = '#0f172a';
  contenedor.style.fontFamily = 'system-ui, sans-serif';
  contenedor.innerHTML = `
    <div style="margin-bottom:16px;">
      <h1 style="font-size:20px;font-weight:900;margin:0 0 4px;">${titulo}</h1>
      <p style="font-size:11px;color:#64748b;margin:0;">Generado el ${new Date().toLocaleString('es-MX')} · ${textoFiltros(filtros, listas)}</p>
    </div>
  `;
  const clon = elementoActivo.cloneNode(true);
  clon.style.background = '#ffffff';
  clon.setAttribute('data-tema', 'claro');
  clon.querySelectorAll('[data-tema]').forEach((el) => el.setAttribute('data-tema', 'claro'));
  contenedor.appendChild(clon);
  document.body.appendChild(contenedor);

  try {
    const canvas = await html2canvas(contenedor, { scale: 2, useCORS: true, windowWidth: 1200 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margen = 10;
    const anchoUtil = pageWidth - margen * 2;
    const imgHeight = (canvas.height * anchoUtil) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', margen, position, anchoUtil, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margen;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margen, position, anchoUtil, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`ejecutivo_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error(err);
    alert('No se pudo generar el PDF');
  } finally {
    document.body.removeChild(contenedor);
  }
}

const TITULOS_TAB = {
  resumen: 'Resumen ejecutivo',
  clubes: 'Clubes',
  asistencia: 'Asistencia',
  encuestas: 'Encuestas',
  postulaciones: 'Postulaciones',
};

export function VistaEjecutiva({ d }) {
  const { modoOscuro, cardCls } = useTheme();
  const [tab, setTab] = useState('resumen');

  if (d.cargando) {
    return <Spinner className="py-32" />;
  }

  if (d.error) {
    return (
      <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
        <p className="text-sm text-red-400 font-medium">{d.error}</p>
      </div>
    );
  }

  const subtextoCls = modoOscuro ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6">
      <div className={`${cardCls} border rounded-2xl p-4`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className={`text-lg font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Vista ejecutiva</h2>
            <p className={`text-xs ${subtextoCls}`}>
              {d.actualizadoEn ? `Actualizado: ${formatearFecha(d.actualizadoEn)}` : 'Sin fecha de actualización'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BotonAccion variant="outline" size="sm" onClick={() => descargarExcel(d.filtros)}>
              Exportar Excel
            </BotonAccion>
            <BotonAccion variant="outline" size="sm" onClick={() => exportarPDF(TITULOS_TAB[tab], d.filtros, { clubes: d.clubesDetalle, periodos: d.periodos, licenciaturas: d.licenciaturas })}>
              Exportar PDF
            </BotonAccion>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 w-full">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="clubes">Clubes</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="encuestas">Encuestas</TabsTrigger>
          <TabsTrigger value="postulaciones">Postulaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6">
          <SeccionResumen d={d} />
        </TabsContent>

        <TabsContent value="clubes" className="mt-6">
          <SeccionClubes d={d} />
        </TabsContent>

        <TabsContent value="asistencia" className="mt-6">
          <SeccionAsistencia d={d} />
        </TabsContent>

        <TabsContent value="encuestas" className="mt-6">
          <SeccionEncuestas d={d} />
        </TabsContent>

        <TabsContent value="postulaciones" className="mt-6">
          <SeccionPostulaciones d={d} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
