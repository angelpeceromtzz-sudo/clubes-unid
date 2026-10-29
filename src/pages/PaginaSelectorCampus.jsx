import { Link } from 'react-router-dom';

export default function PaginaSelectorCampus() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-xl">
        <h1 className="text-3xl font-black">Campus</h1>
        <p className="text-base">Selecciona un campus para explorar sus clubes.</p>
        <Link to="/campus/campeche" className="font-semibold underline">Campus Campeche</Link>
      </div>
    </main>
  );
}
