export function Logotipo({ splashActivo }) {
  return (
    <div className="flex items-center shrink-0">
      <img src="/branding/lobounid.png" alt="Lobo UNID" id="navbar-logo" className={`h-10 w-auto shrink-0 transition-opacity duration-200 ${splashActivo ? 'opacity-0' : 'opacity-100'}`} />
      <img src="/branding/clubs-unid.png" alt="Clubs UNID" className="h-12 w-auto object-contain self-center" />
    </div>
  );
}
