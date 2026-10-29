import { Link } from 'react-router-dom';

export default function PaginaConocenos() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-xl">
        <h1 className="text-3xl font-black">Conócenos</h1>
        <p className="text-base">Iniciativa, historia, propósito y visión de Clubs UNID.</p>
        <Link to="/" className="font-semibold underline">Volver a Clubs UNID</Link>
      </div>
    </main>
  );
}
