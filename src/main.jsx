import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './styles/Navbar.css';
import './App.css';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkJsUrl = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || '/clerk';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    {clerkPublishableKey ? (
      <ClerkProvider publishableKey={clerkPublishableKey} clerkJSUrl={clerkJsUrl} proxyUrl={clerkProxyUrl}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

