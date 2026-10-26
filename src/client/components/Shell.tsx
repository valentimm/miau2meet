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
    <Link to="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-ink">
      <Paw className="h-7 w-7 shrink-0 text-plum" />
      <span className="font-display text-[1.35rem] leading-none tracking-tight sm:text-[1.65rem]">
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
    <div className="shell flex min-h-dvh flex-col">
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="shell-header sticky top-0 z-40 border-b border-line/80 bg-cream/90 backdrop-blur-md">
        <div className="shell-bar mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
          <Logo />
          <nav className="shell-nav" aria-label="Principal">
            <Link to="/eventos" className="nav-link">
              <span className="sm:hidden">Eventos</span>
              <span className="hidden sm:inline">Meus eventos</span>
            </Link>
            {pending ? <span className="nav-skeleton animate-pulse" aria-hidden="true" /> : null}
            {!pending && user ? (
              <>
                <span className="hidden max-w-40 truncate text-muted md:inline">{user.name}</span>
                <button type="button" className="btn btn-ghost nav-btn" onClick={() => void signOut()}>
                  Sair
                  <span className="sr-only">, {user.name}</span>
                </button>
              </>
            ) : null}
            {!pending && !user ? (
              <>
                <Link to="/entrar" className="btn btn-ghost nav-btn">
                  Entrar
                </Link>
                <Link to="/cadastrar" className="btn btn-primary nav-btn">
                  <span className="sm:hidden">Conta</span>
                  <span className="hidden sm:inline">Criar conta</span>
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>
      <main id="conteudo" className="min-w-0 flex-1">
        {children}
      </main>
      <footer className="shell-footer mx-auto w-full max-w-6xl text-sm text-muted">
        miau2meet · o horário em que a galera pode
      </footer>
    </div>
  );
}
