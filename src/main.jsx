// Punto de entrada de la aplicación — monta React en el DOM
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.jsx'

// Renderiza la app envuelta en AuthProvider para compartir estado de autenticación
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

// ✦ A
