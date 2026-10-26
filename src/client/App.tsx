import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Shell } from "./components/Shell";
import { AuthPage } from "./pages/Auth";
import { EventPage } from "./pages/EventPage";
import { EventsPage } from "./pages/Events";
import { HomePage } from "./pages/Home";
import { NewEventPage } from "./pages/NewEvent";

export function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/entrar" element={<AuthPage mode="entrar" />} />
          <Route path="/cadastrar" element={<AuthPage mode="cadastrar" />} />
          <Route path="/eventos" element={<EventsPage />} />
          <Route path="/eventos/novo" element={<NewEventPage />} />
          <Route path="/e/:id" element={<EventPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
