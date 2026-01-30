import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Agenda } from './pages/Agenda';
import { Oradores } from './pages/Oradores';
import { Congregacoes } from './pages/Congregacoes';
import { Usuarios } from './pages/Usuarios';
import { RelatoriosPDF } from './pages/RelatoriosPDF';
import { Designacoes } from './pages/Designacoes';
import { Pessoas } from './pages/Pessoas';
import { Escola } from './pages/Escola';
import { Campo } from './pages/Campo';
import { Login } from './pages/Login';
import { DataManagement } from './pages/DataManagement';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastContainer } from './utils/toast';

function App() {
  useEffect(() => {
    // Configuração do Backup Automático ao fechar
    const handleBeforeUnload = () => {
      try {
        const DB_KEY = 'noroeste_jw_db';
        const data = localStorage.getItem(DB_KEY);

        const electronAPI = (window as unknown as { electron?: { ipcRenderer?: { invoke: (channel: string, data: string) => void } } }).electron;
        if (data && electronAPI?.ipcRenderer) {
          console.log('🔄 Enviando backup automático...');
          // invoke é usado aqui sem await intencionalmente para disparar antes do fechamento
          electronAPI.ipcRenderer.invoke('save-backup', data);
        }
      } catch (e) {
        console.error('Falha no backup automático:', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <>
      <ToastContainer />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Dashboard - Todos com permissão 'dashboard' */}
          <Route
            path="/"
            element={
              <ProtectedRoute requiredPermission="dashboard">
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Agenda (inclui Discursos e Histórico) */}
          <Route
            path="/agenda"
            element={
              <ProtectedRoute requiredPermission="agenda">
                <Layout>
                  <Agenda />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Oradores - Removido, agora faz parte da Agenda */}
          <Route
            path="/oradores"
            element={
              <ProtectedRoute requiredPermission="agenda">
                <Layout>
                  <Oradores />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Congregações */}
          <Route
            path="/congregacoes"
            element={
              <ProtectedRoute requiredPermission="congregacoes">
                <Layout>
                  <Congregacoes />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Designações (Indicador) */}
          <Route
            path="/designacoes"
            element={
              <ProtectedRoute requiredPermission="indicador">
                <Layout>
                  <Designacoes />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Pessoas (Gestão de Membros) */}
          <Route
            path="/pessoas"
            element={
              <ProtectedRoute requiredPermission="indicador">
                <Layout>
                  <Pessoas />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Usuários - Somente Admin */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout>
                  <Usuarios />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Dados - Usuários com permissão 'dados' */}
          <Route
            path="/dados"
            element={
              <ProtectedRoute requiredPermission="dados">
                <Layout>
                  <DataManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Escola */}
          <Route
            path="/escola"
            element={
              <ProtectedRoute requiredPermission="escola">
                <Layout>
                  <Escola />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Campo */}
          <Route
            path="/campo"
            element={
              <ProtectedRoute requiredPermission="campo">
                <Layout>
                  <Campo />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Relatórios */}
          <Route
            path="/relatorios-pdf"
            element={
              <ProtectedRoute requiredPermission="relatorios">
                <Layout>
                  <RelatoriosPDF />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
