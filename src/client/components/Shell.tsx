import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { authClient } from "../auth";
import { Paw } from "./Paw";

export function useViewer() {
  const session = authClient.useSession();
  const user = session.data?.user;
  return {
    pending: session.isPending,
    user: user ? { id: user.id, name: user.name, email: user.email } : null,
  };
}

export function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-ink">
      <Paw className="h-7 w-7 text-plum" />
      <span className="font-display text-[1.65rem] leading-none tracking-tight">
        miau<span className="text-plum">2</span>meet
      </span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { pending, user } = useViewer();
  const navigate = useNavigate();

  async function signOut() {
    await authClient.signOut();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-paper focus:px-4 focus:py-2"
      >
        Ir para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-2 text-sm font-bold">
            <Link to="/eventos" className="rounded-full px-3 py-2 hover:bg-white/70">
              <span className="sm:hidden">Eventos</span>
              <span className="hidden sm:inline">Meus eventos</span>
            </Link>
            {pending ? <span className="h-9 w-24 animate-pulse rounded-full bg-line" /> : null}
            {!pending && user ? (
              <>
                <span className="hidden max-w-40 truncate text-muted md:inline">{user.name}</span>
                <button type="button" className="btn btn-ghost px-3 py-2" onClick={() => void signOut()}>
                  Sair
                </button>
              </>
            ) : null}
            {!pending && !user ? (
              <>
                <Link to="/entrar" className="btn btn-ghost px-3 py-2">
                  Entrar
                </Link>
                <Link to="/cadastrar" className="btn btn-primary px-3 py-2">
                  Criar conta
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-muted">
        miau2meet · o horário em que a galera pode
      </footer>
    </div>
  );
}
