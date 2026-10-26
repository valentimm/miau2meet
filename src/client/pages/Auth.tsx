import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { authClient, authMessage, safeNext } from "../auth";
import { useViewer } from "../components/Shell";

export function AuthPage({ mode }: { mode: "entrar" | "cadastrar" }) {
  const { pending: sessionPending, user } = useViewer();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const signUp = mode === "cadastrar";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    const result = signUp
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: next })
      : await authClient.signIn.email({ email: email.trim(), password, callbackURL: next });
    setPending(false);
    if (result.error) {
      setError(authMessage(result.error));
      return;
    }
    // Full load so the new cookie is the only session the next page reads.
    window.location.assign(next);
  }

  if (!sessionPending && user) return <Navigate to={next} replace />;

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2">
      <section className="hidden lg:block">
        <p className="font-display text-5xl leading-tight">
          {signUp ? "Entra na rodinha." : "Que bom te ver de novo."}
        </p>
        <p className="mt-4 max-w-md text-lg text-muted">
          A conta é só para pintar a sua disponibilidade. Quem recebe o link ainda consegue ver o
          calor da grade.
        </p>
      </section>
      <form onSubmit={(event) => void onSubmit(event)} className="card mx-auto w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-4xl">{signUp ? "Criar conta" : "Entrar"}</h1>
        <p className="mt-2 text-sm text-muted">
          {signUp ? "Nome, e-mail e uma senha de 8 caracteres." : "Usa o e-mail da sua conta."}
        </p>
        <div className="mt-6 grid gap-4">
          {signUp ? (
            <label className="field">
              <span>Nome</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={60} autoComplete="name" />
            </label>
          ) : null}
          <label className="field">
            <span>E-mail</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={8}
              autoComplete={signUp ? "new-password" : "current-password"}
            />
          </label>
        </div>
        {error ? <p className="mt-4 text-sm font-bold text-plum-deep">{error}</p> : null}
        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={pending}>
          {pending ? "Um instante…" : signUp ? "Criar conta" : "Entrar"}
        </button>
        <p className="mt-4 text-sm text-muted">
          {signUp ? (
            <>
              Já tem conta?{" "}
              <Link className="font-bold text-plum-deep" to={`/entrar?next=${encodeURIComponent(next)}`}>
                Entrar
              </Link>
            </>
          ) : (
            <>
              Ainda não tem conta?{" "}
              <Link className="font-bold text-plum-deep" to={`/cadastrar?next=${encodeURIComponent(next)}`}>
                Criar conta
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
