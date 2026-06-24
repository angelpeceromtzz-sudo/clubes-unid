import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './services/authConfig';
import './index.css';
import { ProveedorAutenticacion } from './contexts/AuthContext';
import { ProveedorNotificacion } from './contexts/NotificationContext';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <ProveedorAutenticacion>
        <BrowserRouter>
          <ProveedorNotificacion>
            <App />
          </ProveedorNotificacion>
        </BrowserRouter>
      </ProveedorAutenticacion>
    </MsalProvider>
  </StrictMode>,
)
