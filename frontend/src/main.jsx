// Polyfills for simple-peer (must be imported before any other code)
import { Buffer } from 'buffer';
import process from 'process';

// Make them globally available
window.Buffer = Buffer;
window.process = process;

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);