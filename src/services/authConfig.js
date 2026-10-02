import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: '89262870-12e6-41ab-b212-07f34b9bde0a',
    authority: 'https://login.microsoftonline.com/953420d2-c95e-4f65-9573-b601a94f4390',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
  prompt: 'select_account',
};

export const msalInstance = new PublicClientApplication(msalConfig);
