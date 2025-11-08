import 'better-auth';

declare module 'better-auth' {
  // 1. Extiende la interfaz User original para añadirle la propiedad 'role'.
  // TypeScript fusionará esta definición con la que viene de la librería.
  interface User {
    role?: string;
  }
}
