/* Vista ejecutiva compartida para Administración y Rectoría. */
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE, getToken } from '../../services/api-core';
import { GraficaBarrasAgrupadas } from './GraficaBarrasAgrupadas';
import { GraficaBarrasHorizontales } from './GraficaBarrasHorizontales';
import { GraficaOcupacionApilada } from './GraficaOcupacionApilada';
import { BarraOcupacion } from '../ui/BarraOcupacion';
import { Spinner } from '../ui/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

async function exportarPDF(elemento) {
  if (!elemento) return;
  try {
    const canvas = await html2canvas(elemento, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`ejecutivo_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error(err);
    alert('No se pudo generar el PDF');
  }
}

function combinarSeriesPorMes(postulaciones = [], inscripciones = []) {
  const mapa = new Map();
  for (const p of postulaciones) {
    mapa.set(p.clave, { clave: p.clave, mes: p.mes, postulaciones: p.total, inscripciones: 0 });
  }
  for (const i of inscripciones) {
    const actual = mapa.get(i.clave) || { clave: i.clave, mes: i.mes, postulaciones: 0, inscripciones: 0 };
    actual.inscripciones = i.total;
    mapa.set(i.clave, actual);
  }
  return [...mapa.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

function formatearFiltro(clave, valor, listas) {
  if (!valor) return null;
  if (clave === 'id_periodo') {
    const p = listas.periodos.find((x) => String(x.id_periodo) === String(valor));
    return p ? `Periodo: ${p.nombre}` : `Periodo: ${valor}`;
  }
  if (clave === 'id_club') {
    const c = listas.clubes.find((x) => String(x.id_club) === String(valor));
    return c ? `Club: ${c.nombre_club}` : `Club: ${valor}`;
  }
  if (clave === 'carrera') {
    const l = listas.licenciaturas.find((x) => String(x.id_licenciatura) === String(valor));
    return l ? `Licenciatura: ${l.nombre}` : `Licenciatura: ${valor}`;
  }
  if (clave === 'estado') return `Estado: ${valor}`;
  return null;
}

function prepararDatosPregunta(pregunta) {
  if (!pregunta) return null;

  if (pregunta.tipo === 'escala') {
    return {
      tipo: 'escala',
      promedio: pregunta.promedio,
      min: pregunta.escala_min,
      max: pregunta.escala_max,
      datos: (pregunta.distribucion || []).map((d) => ({ nombre: String(d.valor), valor: d.conteo, porcentaje: d.porcentaje })),
    };
  }

  if (pregunta.tipo === 'texto_corto' || pregunta.tipo === 'texto_largo') {
    return {
      tipo: 'texto',
      total: pregunta.total_textos || 0,
      textos: pregunta.textos || [],
    };
  }

  const base = pregunta.respuestas || 1;
  return {
    tipo: 'barras',
    base,
    datos: (pregunta.opciones || []).map((o) => ({
      nombre: o.texto,
      valor: o.conteo || 0,
      porcentaje: o.porcentaje ?? 0,
    })),
  };
}

export function VistaEjecutiva({ d }) {
  const { modoOscuro, cardCls } = useTheme();
  const printRef = useRef(null);

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

  const stats = d.stats || {};
  const totalAlumnos = stats.totalAlumnos || 0;
  const alumnosInscritos = stats.alumnosInscritos || 0;
  const clubesActivos = (d.clubesDetalle || []).filter((c) => c.estatus === 'activo').length;
  const solicitudesPendientes = d.dashboardData?.solicitudesPendientes || 0;
  const participacion = totalAlumnos > 0 ? Math.round((alumnosInscritos / totalAlumnos) * 100) : 0;

  const cupoTotal = (d.clubesDetalle || [])
    .filter((c) => c.estatus === 'activo')
    .reduce((acc, c) => acc + (Number(c.cupo_maximo) || 0), 0);
  const ocupadoTotal = (d.clubesDetalle || [])
    .filter((c) => c.estatus === 'activo')
    .reduce((acc, c) => acc + (Number(c.cupo_ocupado) || 0), 0);
  const ocupacionPct = cupoTotal > 0 ? Math.round((ocupadoTotal / cupoTotal) * 100) : 0;

  const evaluadas = (d.asistencia?.global?.presentes || 0) + (d.asistencia?.global?.ausentes || 0);
  const asistenciaPct = evaluadas > 0 ? Math.round(((d.asistencia?.global?.presentes || 0) / evaluadas) * 1000) / 10 : 0;

  const totalRespuestas = d.encuestas?.total_respuestas || 0;

  const evolucionMensual = combinarSeriesPorMes(
    d.dashboardData?.postulacionesPorMes || [],
    d.dashboardData?.inscripcionesPorMes || []
  );

  const integrantesPorClub = [...(d.clubesDetalle || [])]
    .map((c) => ({ nombre_club: c.nombre_club, valor: Number(c.cupo_ocupado) || 0 }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const ocupacionApilada = [...(d.clubesDetalle || [])]
    .filter((c) => c.estatus === 'activo')
    .map((c) => {
      const ocupado = Number(c.cupo_ocupado) || 0;
      const cupo = Number(c.cupo_maximo) || 0;
      return {
        nombre_club: c.nombre_club,
        ocupado,
        disponible: Math.max(cupo - ocupado, 0),
        cupo,
      };
    })
    .sort((a, b) => b.ocupado - a.ocupado);

  const asistenciaPorClub = (d.asistencia?.por_club || [])
    .map((c) => {
      const ev = c.presentes + c.ausentes;
      return {
        nombre_club: c.nombre_club,
        valor: ev > 0 ? Math.round((c.presentes / ev) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => a.valor - b.valor);

  const respuestasPorLicenciatura = (d.encuestas?.por_licenciatura || [])
    .map((l) => ({ nombre: l.nombre, valor: l.respuestas }))
    .sort((a, b) => b.valor - a.valor);

  const filtrosActivos = Object.entries(d.filtros)
    .map(([clave, valor]) => formatearFiltro(clave, valor, { periodos: d.periodos, clubes: d.clubesDetalle, licenciaturas: d.licenciaturas }))
    .filter(Boolean);

  const preguntaActual = d.preguntaSeleccionada
    ? (d.resultadosEncuesta?.preguntas || []).find((p) => String(p.id_pregunta) === String(d.preguntaSeleccionada))
    : null;
  const datosPregunta = prepararDatosPregunta(preguntaActual);

  const subtextoCls = modoOscuro ? 'text-slate-400' : 'text-slate-500';

  return (
    <div ref={printRef} className="space-y-6">
      <div className={`${cardCls} border rounded-2xl p-4`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className={`text-lg font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Vista ejecutiva</h2>
            <p className={`text-xs ${subtextoCls}`}>
              {d.actualizadoEn ? `Actualizado: ${new Date(d.actualizadoEn).toLocaleString()}` : 'Sin fecha de actualización'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => descargarExcel(d.filtros)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${modoOscuro ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}
            >
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={() => exportarPDF(printRef.current)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${modoOscuro ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}
            >
              Exportar PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${modoOscuro ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>

      <div className={`${cardCls} border rounded-2xl p-4`}>
        <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>Filtros</h3>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <select className="px-3 py-2 rounded-lg border text-sm" value={d.filtros.id_periodo} onChange={(e) => d.aplicarFiltros({ id_periodo: e.target.value })}>
              <option value="">Todos los periodos</option>
              {(d.periodos || []).map((p) => (
                <option key={p.id_periodo} value={p.id_periodo}>{p.nombre}</option>
              ))}
            </select>
            <select className="px-3 py-2 rounded-lg border text-sm" value={d.filtros.id_club} onChange={(e) => d.aplicarFiltros({ id_club: e.target.value })}>
              <option value="">Todos los clubes</option>
              {(d.clubesDetalle || []).map((c) => (
                <option key={c.id_club} value={c.id_club}>{c.nombre_club}</option>
              ))}
            </select>
            <select className="px-3 py-2 rounded-lg border text-sm" value={d.filtros.carrera} onChange={(e) => d.aplicarFiltros({ carrera: e.target.value })}>
              <option value="">Todas las licenciaturas</option>
              {(d.licenciaturas || []).map((l) => (
                <option key={l.id_licenciatura} value={l.id_licenciatura}>{l.nombre}</option>
              ))}
            </select>
            <select className="px-3 py-2 rounded-lg border text-sm" value={d.filtros.estado} onChange={(e) => d.aplicarFiltros({ estado: e.target.value })}>
              <option value="">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En revisión">En revisión</option>
              <option value="Miembro oficial">Miembro oficial</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => d.aplicarFiltros({ id_periodo: '', id_club: '', carrera: '', estado: '' })}
            className="text-sm font-medium text-blue-500 hover:text-blue-600 text-left md:text-right"
          >
            Restablecer filtros
          </button>
        </div>
        {filtrosActivos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filtrosActivos.map((etiqueta) => (
              <span key={etiqueta} className={`text-xs px-2 py-1 rounded-full border ${modoOscuro ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-slate-300 bg-slate-100 text-slate-600'}`}>
                {etiqueta}
              </span>
            ))}
          </div>
        )}
        <p className={`text-xs mt-3 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
          Información complementaria: {totalAlumnos} alumnos registrados activos · {clubesActivos} clubes activos · {solicitudesPendientes} solicitudes pendientes.
        </p>
      </div>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="resumen">Resumen ejecutivo</TabsTrigger>
          <TabsTrigger value="clubes">Clubes y participación</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="encuestas">Encuestas</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${cardCls} border rounded-2xl p-4`}>
              <p className={`text-xs uppercase tracking-wider font-bold ${subtextoCls}`}>Participación</p>
              <p className={`text-3xl font-black mt-1 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{participacion}%</p>
              <p className={`text-xs mt-1 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>{alumnosInscritos} de {totalAlumnos} alumnos activos</p>
            </div>
            <div className={`${cardCls} border rounded-2xl p-4`}>
              <p className={`text-xs uppercase tracking-wider font-bold ${subtextoCls}`}>Ocupación</p>
              <p className={`text-3xl font-black mt-1 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{ocupacionPct}%</p>
              <p className={`text-xs mt-1 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>{ocupadoTotal} de {cupoTotal} plazas</p>
            </div>
            <div className={`${cardCls} border rounded-2xl p-4`}>
              <p className={`text-xs uppercase tracking-wider font-bold ${subtextoCls}`}>Asistencia</p>
              <p className={`text-3xl font-black mt-1 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{asistenciaPct}%</p>
              <p className={`text-xs mt-1 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>Presentes sobre presentes + ausentes</p>
            </div>
            <div className={`${cardCls} border rounded-2xl p-4`}>
              <p className={`text-xs uppercase tracking-wider font-bold ${subtextoCls}`}>Respuestas</p>
              <p className={`text-3xl font-black mt-1 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{totalRespuestas}</p>
              <p className={`text-xs mt-1 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>Respuestas recibidas en encuestas</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GraficaOcupacionApilada titulo="Ocupación por club" datos={ocupacionApilada.slice(0, 10)} cargando={false} />
            <GraficaBarrasAgrupadas
              titulo="Evolución mensual"
              datos={evolucionMensual}
              series={[
                { dataKey: 'postulaciones', nombre: 'Postulaciones', color: '#3b82f6' },
                { dataKey: 'inscripciones', nombre: 'Altas de inscripción', color: '#10b981' },
              ]}
              cargando={false}
            />
          </div>
        </TabsContent>

        <TabsContent value="clubes" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GraficaBarrasHorizontales
              titulo="Integrantes por club"
              datos={integrantesPorClub.slice(0, 10)}
              dataKey="valor"
              labelKey="nombre_club"
              unit="integrantes"
              color="#f59e0b"
              cargando={false}
            />
            <div className={`${cardCls} border rounded-2xl p-4`}>
              <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                Ocupación detallada
              </h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {ocupacionApilada.slice(0, 10).map((c) => (
                  <BarraOcupacion
                    key={c.nombre_club}
                    nombre={c.nombre_club}
                    maximo={c.cupo}
                    ocupado={c.ocupado}
                    modoOscuro={modoOscuro}
                  />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="asistencia" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GraficaBarrasHorizontales
              titulo="Asistencia por club (%)"
              datos={asistenciaPorClub.slice(0, 10)}
              dataKey="valor"
              labelKey="nombre_club"
              unit="%"
              color="#8b5cf6"
              maxDomain={100}
              cargando={false}
            />
            <div className={`${cardCls} border rounded-2xl p-4`}>
              <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                Asistencia en sesiones completadas
              </h3>
              {d.asistencia?.estado === 'sin_datos' ? (
                <p className={`text-sm ${subtextoCls}`}>No hay sesiones completadas con asistencia registrada.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className={`text-2xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{d.asistencia?.global?.porcentaje ?? 0}%</p>
                      <p className={`text-xs ${subtextoCls}`}>Promedio</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{d.asistencia?.global?.presentes ?? 0}</p>
                      <p className={`text-xs ${subtextoCls}`}>Presentes</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{d.asistencia?.global?.ausentes ?? 0}</p>
                      <p className={`text-xs ${subtextoCls}`}>Ausentes</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-black ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>{d.asistencia?.global?.justificadas ?? 0}</p>
                      <p className={`text-xs ${subtextoCls}`}>Justificadas</p>
                    </div>
                  </div>
                  <p className={`text-xs mb-2 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                    Fórmula: presentes / (presentes + ausentes) en sesiones completadas. Las justificadas se muestran aparte.
                  </p>
                  <table className="w-full text-sm">
                    <thead className={`${modoOscuro ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <tr>
                        <th className="text-left px-3 py-2">Club</th>
                        <th className="text-right px-3 py-2">% Asistencia</th>
                        <th className="text-right px-3 py-2">Presentes</th>
                        <th className="text-right px-3 py-2">Ausentes</th>
                        <th className="text-right px-3 py-2">Justificadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(d.asistencia?.por_club || []).map((c) => {
                        const ev = c.presentes + c.ausentes;
                        const pct = ev > 0 ? Math.round((c.presentes / ev) * 1000) / 10 : 0;
                        return (
                          <tr key={c.id_club} className={`border-t ${modoOscuro ? 'border-slate-700' : 'border-slate-200'}`}>
                            <td className="px-3 py-2">{c.nombre_club}</td>
                            <td className="px-3 py-2 text-right">{pct}%</td>
                            <td className="px-3 py-2 text-right">{c.presentes}</td>
                            <td className="px-3 py-2 text-right">{c.ausentes}</td>
                            <td className="px-3 py-2 text-right">{c.justificadas}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="encuestas" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GraficaBarrasHorizontales
              titulo="Respuestas por licenciatura"
              datos={respuestasPorLicenciatura.slice(0, 10)}
              dataKey="valor"
              labelKey="nombre"
              unit="respuestas"
              color="#ec4899"
              cargando={false}
            />
            <div className={`${cardCls} border rounded-2xl p-4`}>
              <h3 className={`text-sm font-black uppercase tracking-wider mb-3 ${modoOscuro ? 'text-white' : 'text-slate-900'}`}>
                Preferencias de encuestas
              </h3>
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <select
                  className="px-3 py-2 rounded-lg border text-sm"
                  value={d.encuestaSeleccionada}
                  onChange={(e) => d.seleccionarEncuesta(e.target.value)}
                >
                  <option value="">Selecciona una encuesta</option>
                  {(d.listaEncuestas || []).map((e) => (
                    <option key={e.id_encuesta} value={e.id_encuesta}>{e.titulo} ({e.total_respuestas} respuestas)</option>
                  ))}
                </select>
                {d.encuestaSeleccionada && (
                  <select
                    className="px-3 py-2 rounded-lg border text-sm"
                    value={d.preguntaSeleccionada}
                    onChange={(e) => d.seleccionarPregunta(e.target.value)}
                  >
                    <option value="">Selecciona una pregunta</option>
                    {(d.resultadosEncuesta?.preguntas || []).map((p) => (
                      <option key={p.id_pregunta} value={p.id_pregunta}>{p.texto}</option>
                    ))}
                  </select>
                )}
              </div>

              {d.cargandoResultados && <p className={`text-sm ${subtextoCls}`}>Cargando resultados...</p>}

              {!d.encuestaSeleccionada && (
                <p className={`text-sm ${subtextoCls}`}>
                  Selecciona una encuesta para ver preferencias, distribución y comparativas.
                </p>
              )}

              {d.encuestaSeleccionada && !d.preguntaSeleccionada && (
                <div className="space-y-2 text-sm">
                  <p className={subtextoCls}>Selecciona una pregunta para ver su distribución.</p>
                  <p className={subtextoCls}>Total de respuestas: {d.resultadosEncuesta?.total_respuestas ?? 0}</p>
                </div>
              )}

              {datosPregunta && datosPregunta.tipo === 'barras' && (
                <>
                  <GraficaBarrasHorizontales
                    titulo={preguntaActual.texto}
                    datos={datosPregunta.datos}
                    dataKey="valor"
                    labelKey="nombre"
                    unit="respuestas"
                    color="#ec4899"
                    cargando={false}
                  />
                  <p className={`text-xs mt-2 ${modoOscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                    Base de respuestas: {datosPregunta.base}
                  </p>
                  <table className="w-full text-sm mt-2">
                    <thead className={`${modoOscuro ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <tr>
                        <th className="text-left px-3 py-2">Opción</th>
                        <th className="text-right px-3 py-2">Cantidad</th>
                        <th className="text-right px-3 py-2">Porcentaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosPregunta.datos.map((o) => (
                        <tr key={o.nombre} className={`border-t ${modoOscuro ? 'border-slate-700' : 'border-slate-200'}`}>
                          <td className="px-3 py-2">{o.nombre}</td>
                          <td className="px-3 py-2 text-right">{o.valor}</td>
                          <td className="px-3 py-2 text-right">{o.porcentaje}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {datosPregunta && datosPregunta.tipo === 'escala' && (
                <>
                  <p className={`text-sm ${subtextoCls}`}>
                    Promedio: {datosPregunta.promedio ?? 'Sin datos'} (escala {datosPregunta.min}–{datosPregunta.max})
                  </p>
                  <GraficaBarrasHorizontales
                    titulo={preguntaActual.texto}
                    datos={datosPregunta.datos}
                    dataKey="valor"
                    labelKey="nombre"
                    unit="respuestas"
                    color="#06b6d4"
                    cargando={false}
                  />
                </>
              )}

              {datosPregunta && datosPregunta.tipo === 'texto' && (
                <>
                  <p className={`text-sm ${subtextoCls}`}>
                    Total de respuestas de texto: {datosPregunta.total}
                  </p>
                  <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto text-sm">
                    {datosPregunta.textos.slice(0, 20).map((t, i) => (
                      <li key={i} className={subtextoCls}>{t.texto}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
