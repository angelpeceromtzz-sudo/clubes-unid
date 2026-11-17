export function leerSegundosReintento(res) {
  const retryAfter = res.headers.get('retry-after');

  if (retryAfter) {
    const segundos = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(segundos) && segundos >= 0) {
      return segundos;
    }

    const fecha = Date.parse(retryAfter);
    if (Number.isFinite(fecha)) {
      return Math.max(0, Math.ceil((fecha - Date.now()) / 1000));
    }
  }

  const rateLimit = res.headers.get('ratelimit');
  const reset = rateLimit?.match(/(?:^|[;,\s])(?:t|reset)=(\d+)/i)?.[1]
    ?? res.headers.get('ratelimit-reset')
    ?? res.headers.get('x-ratelimit-reset');
  if (reset) {
    const segundos = Number.parseInt(reset, 10);
    if (Number.isInteger(segundos) && segundos >= 0) {
      return segundos;
    }
  }

  return null;
}
