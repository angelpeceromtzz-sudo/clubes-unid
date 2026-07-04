export function ErrorAlerta({ mensaje }) {
  if (!mensaje) return null;
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
      <p className="text-red-400 text-sm font-medium">{mensaje}</p>
    </div>
  );
}
