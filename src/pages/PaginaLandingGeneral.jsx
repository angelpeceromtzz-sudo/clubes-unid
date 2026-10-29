import { Link } from 'react-router-dom';

export default function PaginaLandingGeneral() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-xl">
        <h1 className="text-3xl font-black">Clubs UNID</h1>
        <p className="text-base">Plataforma general de clubes universitarios.</p>
        <nav className="flex flex-wrap gap-3 justify-center">
          <Link to="/conocenos" className="font-semibold underline">Conócenos</Link>
          <Link to="/campus" className="font-semibold underline">Campus</Link>
        </nav>
      </div>
    </main>
  );
}
