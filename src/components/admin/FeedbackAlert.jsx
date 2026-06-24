export function AlertaRetroalimentacion({ feedback, errorFeedback }) {
  return (
    <>
      {feedback && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm font-medium">{feedback}</p>
        </div>
      )}
      {errorFeedback && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">{errorFeedback}</p>
        </div>
      )}
    </>
  );
}
