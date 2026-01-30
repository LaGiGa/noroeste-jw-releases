import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'
import { db } from './services/database'
// import { jworgImportService } from './services/jworgImportService' // Desabilitado junto com prefetch
import { ThemeProvider } from './contexts/ThemeContext'

// Inicializar o banco de dados ao iniciar a aplicação
console.log('🚀 Iniciando Noroeste...');
db.initialize();
console.log('✅ Banco de dados pronto!');

// Prefetch desabilitado - causava abertura de múltiplas janelas do JW.org
// O cache será feito sob demanda quando o usuário acessar a aba Escola
/*
(async () => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const issues = [1, 3, 5, 7, 9, 11];
    const targets = issues.map(im => ({ y: year, im }));
    await Promise.all(targets.map(async (t) => {
      const key = `jworg_cache_${t.y}-${t.im}`;
      const semanas = await jworgImportService.importarApostilaMes(t.y, t.im);
      if (semanas && semanas.length > 0) {
        localStorage.setItem(key, JSON.stringify({ semanas, timestamp: new Date().toISOString() }));
      }
    }));
  } catch (e) {
    console.warn('Prefetch falhou', e);
  }
})();
*/

// Backup automático ao fechar a aplicação
window.onbeforeunload = () => {
  try {
    const data = db.exportData();
    const win = window as any;
    if (win.electron && win.electron.saveBackup) {
      win.electron.saveBackup(data);
    }
  } catch (err) {
    console.error('Erro ao realizar backup automático:', err);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
