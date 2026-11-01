import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AlertProvider } from './components/Alert';

import '../css/theme.css';
import '../css/main.css';
import '../css/tree.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('service-worker.js', { scope: './' }).catch((err) => {
        console.error('ServiceWorker registration failed with error: "' + err + '"');
    });
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AlertProvider>
            <App />
        </AlertProvider>
    </StrictMode>
);
