import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '89262870-12e6-41ab-b212-07f34b9bde0a',
    authority: import.meta.env.VITE_AZURE_AUTHORITY || 'https://login.microsoftonline.com/953420d2-c95e-4f65-9573-b601a94f4390',
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'),
  },
  cache: {
    // T-034 (H9 aceptado): se mantiene localStorage. La seguridad depende de la
    // ausencia de sinks XSS en src/ y de la CSP servida por Vercel. No guardar
    // tokens adicionales aquí.
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
  prompt: 'select_account',
};

export const msalInstance = new PublicClientApplication(msalConfig);
