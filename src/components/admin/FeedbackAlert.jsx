import { ErrorAlerta } from '../ui/ErrorAlerta';

export function AlertaRetroalimentacion({ feedback, errorFeedback }) {
  return (
    <>
      {feedback && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-emerald-400 text-sm font-medium">{feedback}</p>
        </div>
      )}
      <ErrorAlerta mensaje={errorFeedback} />
    </>
  );
}
