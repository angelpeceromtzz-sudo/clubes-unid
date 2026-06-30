export function generarListaAsistencia(nombreClub, bloque, fecha, hora, lugar, alumnos) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Lista de Asistencia - ${nombreClub} - Bloque ${bloque}</title>
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
</style></head>
<body>
  <h1>${nombreClub}</h1>
  <h2>Lista de Asistencia - Bloque ${bloque}</h2>
  <div class="info">
    <span><strong>Fecha:</strong> ${fecha || '—'}</span>
    <span><strong>Hora:</strong> ${hora || '—'}</span>
    <span><strong>Lugar:</strong> ${lugar || '—'}</span>
  </div>
  <table>
    <tr><th class="num">#</th><th>Nombre</th><th>Matrícula</th><th class="firma">Asistió</th></tr>
${alumnos.map((a, i) => `    <tr><td class="num">${i + 1}</td><td>${a.nombre_completo}</td><td>${a.matricula}</td><td class="firma"></td></tr>`).join('\n')}
  </table>
  <p style="text-align:center;margin-top:40px;font-size:10px;color:#aaa;">Documento generado por Clubes UNID</p>
</body></html>`;
}
