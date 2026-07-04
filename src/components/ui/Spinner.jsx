export function Spinner({ className = 'py-16' }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full" />
    </div>
  );
}
