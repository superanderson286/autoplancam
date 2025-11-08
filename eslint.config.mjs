import { FlatCompat } from "@eslint/eslintrc/dist/eslintrc-universal.cjs";
import path from "path";
import { fileURLToPath } from "url";

// Simula __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializa el traductor de compatibilidad
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Usa el traductor para extender las configuraciones de Next.js
  ...compat.extends("next/core-web-vitals", "plugin:@typescript-eslint/recommended"),
];
