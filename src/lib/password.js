// Regla de contraseñas. Sin imports: la usan el servidor (validación) y los formularios (pista).
// En desarrollo se acepta cualquier contraseña (p. ej. "123") para agilizar las pruebas;
// en producción se exige una contraseña segura. Next inlinea NODE_ENV también en el navegador.
export const STRICT_PASSWORDS = process.env.NODE_ENV === "production";

export const PASSWORD_HINT = STRICT_PASSWORDS
  ? "Mínimo 8 caracteres, con letras y números"
  : "Cualquiera (modo pruebas)";

// Devuelve el mensaje de error, o null si la contraseña es válida.
export function passwordError(password) {
  if (!password) return "Ingresa una contraseña.";
  if (!STRICT_PASSWORDS) return null;
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Mínimo 8 caracteres, con letras y números.";
  }
  return null;
}
