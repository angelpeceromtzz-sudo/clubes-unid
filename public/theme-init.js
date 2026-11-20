let modoOscuro = true;
try {
  const guardado = localStorage.getItem('theme');
  modoOscuro = guardado === null || guardado === 'dark';
} catch {
  // Conserva el tema predeterminado si el almacenamiento no está disponible.
}
document.documentElement.classList.toggle('dark', modoOscuro);
const metaTheme = document.querySelector('meta[name="theme-color"]');
if (metaTheme) metaTheme.content = modoOscuro ? '#0b111e' : '#f8fafc';
const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
if (metaColorScheme) metaColorScheme.content = modoOscuro ? 'dark' : 'light';