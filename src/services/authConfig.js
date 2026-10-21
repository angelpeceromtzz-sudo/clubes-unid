import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'b46fabab-c879-428e-9f1a-e3b39f67150e',
    authority: import.meta.env.VITE_AZURE_AUTHORITY || 'https://login.microsoftonline.com/953420d2-c95e-4f65-9573-b601a94f4390',
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'),
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
  prompt: 'select_account',
  extraQueryParameters: {
    domain_hint: 'red.unid.mx',
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
