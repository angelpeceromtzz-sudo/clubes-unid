import { Alerta } from '../ui/Alerta';

export function AlertaRetroalimentacion({ feedback, errorFeedback }) {
  return (
    <>
      {feedback && <Alerta tipo="success" mensaje={feedback} />}
      {errorFeedback && <Alerta tipo="error" mensaje={errorFeedback} />}
    </>
  );
}
