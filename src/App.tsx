import { Route, Routes, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import CentralGestaoCredenciamento from "./pages/CentralGestaoCredenciamento";
import Clinicas from "./pages/Clinicas";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/gestao" element={<CentralGestaoCredenciamento />} />
        <Route path="/clinicas" element={<Clinicas />} />
        <Route path="/" element={<Navigate to="/gestao" replace />} />
      </Routes>
    </AppLayout>
  );
}
