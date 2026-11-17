import { jsPDF } from 'jspdf';

// El reporte usa texto y vectores para conservar nitidez y permitir búsquedas.
export function generarPDF(reporte) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const margen = 16;
  const ancho = 178;
  const limite = 276;
  const azul = [14, 22, 44];
  const gris = [91, 107, 128];
  let y;
  const limpio = (valor) => String(valor ?? '').normalize('NFC').replace(/\p{Cc}/gu, (caracter) => caracter === '\n' ? '\n' : ' ').replace(/[\u2010-\u2015]/g, '-');
  const estilo = (tamano = 9, negrita = false, color = azul) => {
    pdf.setFont('helvetica', negrita ? 'bold' : 'normal');
    pdf.setFontSize(tamano);
    pdf.setTextColor(...color);
  };
  const lineas = (texto, espacio) => pdf.splitTextToSize(limpio(texto), espacio);

  function cabecera() {
    pdf.setFillColor(...azul);
    pdf.rect(0, 0, 210, 27, 'F');
    estilo(11, true, [255, 255, 255]);
    pdf.text('CLUBS UNID', margen, 13);
    estilo(8, false, [220, 227, 238]);
    pdf.text('REPORTE DE ESTADÍSTICAS', margen, 20);
    pdf.setFillColor(251, 191, 36);
    pdf.rect(0, 27, 210, 1.2, 'F');
    y = 38;
  }
  function pagina() { pdf.addPage(); cabecera(); }
  function espacio(alto) { if (y + alto > limite) pagina(); }
  function parrafo(texto, tamano = 9, color = gris) {
    estilo(tamano, false, color);
    const partes = lineas(texto, ancho);
    for (const parte of partes) {
      espacio(5);
      estilo(tamano, false, color);
      pdf.text(parte, margen, y);
      y += 4.8;
    }
    y += 2;
  }
  function titulo(texto, continuacion = false) {
    espacio(16);
    estilo(11, true);
    const partes = lineas(`${texto}${continuacion ? ' (continuación)' : ''}`, ancho);
    for (const parte of partes) {
      espacio(6);
      estilo(11, true);
      pdf.text(parte, margen, y);
      y += 5.5;
    }
    y += 3;
  }

  cabecera();
  estilo(22, true);
  const tituloPrincipal = lineas(reporte.titulo, ancho);
  pdf.text(tituloPrincipal, margen, y + 2);
  y += tituloPrincipal.length * 9 + 3;
  parrafo(`Generado: ${reporte.generadoEn} (Ciudad de México)`, 8);
  if (reporte.actualizadoEn) parrafo(`Datos actualizados: ${reporte.actualizadoEn}`, 8);
  for (const filtro of reporte.filtros) parrafo(filtro, 9, azul);
  if (!reporte.filtros.length) parrafo('Sin filtros adicionales.', 9);
  parrafo(reporte.nota, 8);
  y += 3;

  const anchoTarjeta = (ancho - 4 * 3) / 4;
  for (let i = 0; i < reporte.indicadores.length; i += 4) {
    espacio(28);
    reporte.indicadores.slice(i, i + 4).forEach(([etiqueta, valor], indice) => {
      const x = margen + indice * (anchoTarjeta + 4);
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(x, y, anchoTarjeta, 24, 2, 2, 'F');
      estilo(8, false, gris);
      pdf.text(lineas(etiqueta, anchoTarjeta - 8), x + 4, y + 6);
      estilo(15, true);
      const tamano = pdf.getTextWidth(limpio(valor)) > anchoTarjeta - 8 ? 11 : 15;
      estilo(tamano, true);
      pdf.text(limpio(valor), x + 4, y + 19);
    });
    y += 30;
  }

  for (const grafica of reporte.graficas) {
    const filas = grafica.filas.slice(0, 10);
    if (!filas.length || !filas.some((fila) => fila.valor > 0)) continue;
    espacio(24 + Math.min(filas.length, 3) * 12);
    titulo(grafica.titulo);
    const maximo = Math.max(grafica.porcentaje ? 100 : 1, ...filas.map((fila) => fila.valor));
    for (const fila of filas) {
      espacio(15);
      estilo(8);
      const nombre = lineas(fila.nombre, 68);
      const alto = Math.max(12, nombre.length * 3.5 + 3);
      espacio(alto);
      estilo(8);
      pdf.text(nombre, margen, y + 3.5);
      pdf.setFillColor(231, 237, 244);
      pdf.roundedRect(margen + 72, y, 86, 5, 1, 1, 'F');
      if (fila.valor > 0) {
        pdf.setFillColor(16, 135, 113);
        pdf.roundedRect(margen + 72, y, Math.max(0.5, fila.valor / maximo * 86), 5, 1, 1, 'F');
      }
      estilo(8, true);
      pdf.text(grafica.porcentaje ? `${fila.valor.toFixed(1)}%` : fila.valor.toLocaleString('es-MX'), margen + ancho, y + 4, { align: 'right' });
      y += alto;
    }
    if (grafica.filas.length > filas.length) parrafo(`Gráfica: ${filas.length} de ${grafica.filas.length} registros. Todos los registros se incluyen en las tablas.`, 8);
    y += 5;
  }

  for (const tabla of reporte.tablas) {
    espacio(28);
    titulo(tabla.titulo);
    if (tabla.descripcion) parrafo(tabla.descripcion, 8);
    const totalPesos = tabla.pesos.reduce((total, valor) => total + valor, 0);
    const anchos = tabla.pesos.map((peso) => peso / totalPesos * ancho);
    let altoEncabezado;
    let inicioPagina;
    function encabezado() {
      estilo(8, true);
      const textos = tabla.encabezados.map((texto, i) => lineas(texto, anchos[i] - 6));
      altoEncabezado = Math.max(...textos.map((texto) => texto.length)) * 4 + 6;
      espacio(altoEncabezado + 10);
      pdf.setFillColor(...azul);
      pdf.rect(margen, y, ancho, altoEncabezado, 'F');
      let x = margen;
      textos.forEach((texto, i) => {
        estilo(8, true, [255, 255, 255]);
        pdf.text(texto, x + 3, y + 5);
        x += anchos[i];
      });
      y += altoEncabezado;
      inicioPagina = y;
    }
    encabezado();
    if (!tabla.filas.length) { y += 6; parrafo('Sin registros para los filtros seleccionados.'); }
    tabla.filas.forEach((fila, indice) => {
      estilo(8);
      const textos = fila.map((valor, i) => lineas(valor, anchos[i] - 6));
      let pendientes = Math.max(...textos.map((texto) => texto.length));
      let inicio = 0;
      while (pendientes > 0) {
        if (y + 10 > limite) { pagina(); titulo(tabla.titulo, true); encabezado(); }
        const capacidad = Math.max(1, Math.floor((limite - y - 5) / 4));
        // Las filas normales se mantienen completas; los textos largos continúan en la página siguiente.
        if (inicio === 0 && y > inicioPagina && pendientes > capacidad && pendientes * 4 + 5 <= limite - 65) {
          pagina(); titulo(tabla.titulo, true); encabezado();
          continue;
        }
        const cantidad = Math.min(pendientes, capacidad);
        const alto = cantidad * 4 + 5;
        if (indice % 2 === 0) { pdf.setFillColor(244, 247, 250); pdf.rect(margen, y, ancho, alto, 'F'); }
        let x = margen;
        textos.forEach((texto, i) => {
          const parte = texto.slice(inicio, inicio + cantidad);
          if (parte.length) { estilo(8); pdf.text(parte, x + 3, y + 5); }
          x += anchos[i];
        });
        y += alto;
        inicio += cantidad;
        pendientes -= cantidad;
      }
    });
    y += 9;
  }
  const paginas = pdf.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(220, 227, 238);
    pdf.line(margen, 283, margen + ancho, 283);
    estilo(8, false, gris);
    pdf.text('Clubs UNID | Estadísticas', margen, 289);
    pdf.text(`Página ${i} de ${paginas}`, margen + ancho, 289, { align: 'right' });
  }
  pdf.setProperties({ title: `${reporte.titulo} - Clubs UNID`, author: 'Clubs UNID', subject: 'Reporte de estadísticas' });
  return pdf;
}
