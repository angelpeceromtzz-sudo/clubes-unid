import { ErrorAlerta } from '../ui/ErrorAlerta';
import { Alerta } from '../ui/Alerta';

export function AlertaRetroalimentacion({ feedback, errorFeedback }) {
  return (
    <>
      {feedback && <Alerta tipo="success" mensaje={feedback} />}
      <ErrorAlerta mensaje={errorFeedback} />
    </>
  );
}
