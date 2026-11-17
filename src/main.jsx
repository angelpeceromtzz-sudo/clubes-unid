import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './services/authConfig';
import './index.css';
import { ProveedorAutenticacion } from './contexts/AuthContext';
import { ProveedorNotificacion } from './contexts/NotificationContext';
import { ProveedorNoticias } from './contexts/NoticiasContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PanelNavProvider } from './contexts/PanelNavContext';
import App from './App.jsx';

// Evita que cualquier imagen pueda arrastrarse de forma nativa en el navegador.
if (typeof document !== 'undefined') {
  document.addEventListener(
    'dragstart',
    (evento) => {
      if (evento.target && evento.target.tagName === 'IMG') {
        evento.preventDefault();
      }
    },
    true,
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <ProveedorAutenticacion>
        <BrowserRouter>
          <ProveedorNotificacion>
            <ProveedorNoticias>
              <ThemeProvider>
                <PanelNavProvider>
                  <App />
                </PanelNavProvider>
              </ThemeProvider>
            </ProveedorNoticias>
          </ProveedorNotificacion>
        </BrowserRouter>
      </ProveedorAutenticacion>
    </MsalProvider>
  </StrictMode>,
)
