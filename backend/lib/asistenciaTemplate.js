// Escapa texto para insertarlo como contenido HTML (nodos de texto y atributos
// entre comillas). Los datos de la lista (nombres, matrículas, club, lugar)
// los controlan alumnos y líderes: sin escape, un nombre con <script> o
// con comillas se interpreta como marcado al abrir o imprimir el documento.
// Ver auditoría H1 (AUDITORIA-SEGURIDAD.md).
function escapeHtml(valor) {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function generarListaAsistencia(nombreClub, bloque, fecha, hora, lugar, alumnos) {
  const fechaTexto = fecha
    ? fecha.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      })
    : '—';
  const horaTexto = hora ? hora.slice(0, 5) : '—';
  const clubSeguro = escapeHtml(nombreClub);
  const bloqueSeguro = escapeHtml(bloque);
  const fechaSegura = escapeHtml(fechaTexto);
  const horaSegura = escapeHtml(horaTexto);
  const lugarSeguro = escapeHtml(lugar || '—');
  const filasAlumnos = alumnos
    .map(
      (a, i) =>
        `    <tr><td class="num">${i + 1}</td><td>${escapeHtml(a.nombre_completo)}</td><td>${escapeHtml(a.matricula)}</td><td class="firma"></td></tr>`
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Lista de Asistencia - ${clubSeguro} - Bloque ${bloqueSeguro}</title>
<style>
  body { font-family: 'Courier New', monospace; padding: 40px; }
  h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
  h2 { text-align: center; font-size: 16px; color: #555; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 30px; }
  th { background: #333; color: #fff; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
  td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 14px; }
  .num { width: 40px; text-align: center; }
  .firma { width: 150px; }
  .info { margin-top: 20px; font-size: 12px; color: #777; }
  .info span { display: inline-block; margin-right: 30px; }
  .btn-print { display: block; margin: 30px auto 0; padding: 10px 24px; background: #333; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  @media print { .btn-print { display: none; } }
</style></head>
<body onload="window.print()">
  <button class="btn-print" onclick="window.print()">🖨 Imprimir</button>
  <h1>${clubSeguro}</h1>
  <h2>Lista de Asistencia - Bloque ${bloqueSeguro}</h2>
  <div class="info">
    <span><strong>Fecha:</strong> ${fechaSegura}</span>
    <span><strong>Hora:</strong> ${horaSegura}</span>
    <span><strong>Lugar:</strong> ${lugarSeguro}</span>
  </div>
  <table>
    <tr><th class="num">#</th><th>Nombre</th><th>Matrícula</th><th class="firma">Asistió</th></tr>
${filasAlumnos}
  </table>
  <p style="text-align:center;margin-top:40px;font-size:10px;color:#aaa;">Documento generado por Clubes UNID</p>
</body></html>`;
}
