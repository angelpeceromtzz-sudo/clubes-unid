import { Alerta } from './Alerta';

export function ErrorAlerta({ mensaje }) {
  if (!mensaje) return null;
  return <Alerta tipo="error" mensaje={mensaje} />;
}
