/* Hook compartido para feedback y error feedback con auto-limpieza. */
import { useState, useEffect } from 'react';

export function useFeedback() {
  const [feedback, setFeedback] = useState('');
  const [errorFeedback, setErrorFeedback] = useState('');

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(''), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  useEffect(() => {
    if (errorFeedback) {
      const t = setTimeout(() => setErrorFeedback(''), 4000);
      return () => clearTimeout(t);
    }
  }, [errorFeedback]);

  return { feedback, setFeedback, errorFeedback, setErrorFeedback };
}
