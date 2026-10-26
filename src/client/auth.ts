import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

const MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse e-mail.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha não batem.",
  INVALID_EMAIL: "Esse e-mail não parece válido.",
  INVALID_PASSWORD: "Senha inválida.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "Essa senha ficou longa demais.",
};

export function authMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return "Não consegui entrar. Tenta de novo.";
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  return "Não consegui entrar. Tenta de novo.";
}

export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/eventos";
  return value;
}
