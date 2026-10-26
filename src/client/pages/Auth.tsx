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
    <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-6 sm:py-12 lg:min-h-[70vh] lg:grid-cols-2">
      <section className="hidden lg:block">
        <p className="font-display text-5xl leading-tight">
          {signUp ? "Entra na rodinha." : "Que bom te ver de novo."}
        </p>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
          A conta é só para pintar a sua disponibilidade. Quem recebe o link ainda consegue ver o
          calor da grade.
        </p>
      </section>
      <form onSubmit={(event) => void onSubmit(event)} className="card mx-auto w-full min-w-0 max-w-md p-4 sm:p-8">
        <h1 className="font-display text-[2rem] leading-tight sm:text-4xl">{signUp ? "Criar conta" : "Entrar"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted lg:hidden">
          {signUp ? "Entra na rodinha. A conta é só para pintar a sua disponibilidade." : "Que bom te ver de novo."}
        </p>
        <p className="mt-2 hidden text-sm leading-relaxed text-muted lg:block">
          {signUp ? "Nome, e-mail e uma senha de 8 caracteres." : "Usa o e-mail da sua conta."}
        </p>
        <div className="mt-6 grid gap-4">
          {signUp ? (
            <label className="field">
              <span>Nome</span>
              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={60}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                inputMode="text"
              />
            </label>
          ) : null}
          <label className="field">
            <span>E-mail</span>
            <input
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              inputMode="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={8}
              autoComplete={signUp ? "new-password" : "current-password"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
            />
          </label>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm font-bold leading-relaxed text-plum-deep">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={pending} aria-busy={pending}>
          {pending ? "Um instante…" : signUp ? "Criar conta" : "Entrar"}
        </button>
        <p className="mt-4 text-sm text-muted">{signUp ? "Já tem conta?" : "Ainda não tem conta?"}</p>
        <Link
          className="btn btn-ghost mt-2 w-full"
          to={signUp ? `/entrar?next=${encodeURIComponent(next)}` : `/cadastrar?next=${encodeURIComponent(next)}`}
        >
          {signUp ? "Entrar" : "Criar conta"}
        </Link>
      </form>
    </div>
  );
}
