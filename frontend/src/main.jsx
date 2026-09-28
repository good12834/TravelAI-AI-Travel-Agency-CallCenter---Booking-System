import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/**
 * Browser extensions inject content scripts that answer `chrome.runtime` messages
 * asynchronously and sometimes lose the message port: content-script cross-origin fetches
 * have been disallowed since Chrome 73, MV3 service workers get suspended mid-flight, and
 * any page navigation tears the context down. Chrome reports that failure as an unhandled
 * rejection *inside the page*, labelled with the current route ("bookings:1", "live:1"), so
 * it reads as an app error even though no page code is involved:
 *
 *   A listener indicated an asynchronous response by returning true, but the message
 *   channel closed before a response was received
 *
 * TravelAI has no chrome.runtime / chrome.tabs / postMessage code at all (verified in src/
 * and in the built bundle), so a rejection carrying that message can only originate from an
 * injected extension script and is never actionable here. Suppress exactly that message —
 * Chrome's "Uncaught (in promise)" line — and leave every other rejection untouched. The
 * trace below stays hidden unless DevTools is switched to Verbose level.
 *
 * LIMITS: this reaches only rejections raised in the page's own JS world. The message is
 * normally raised by extension code calling `chrome.tabs.sendMessage` (background/service
 * worker) whose content-script listener returned `true` and then died with the context
 * before `sendResponse`. Those worlds — an MV3 service worker, or a content script's
 * isolated world — are separate V8 contexts; the browser prints their errors in the tab
 * console (which is why the source reads "live:1" / "bookings:1", i.e. the page URL) but
 * never delivers them to a page listener, so they cannot be cancelled from here. For those,
 * disable/restrict the offending extension, or filter the console with DevTools →
 * gear icon → "Selected context only". The polyfill path that most commonly produces it is
 * documented in mozilla/webextension-polyfill#384 and ghostery/ghostery-extension#830.
 */
const EXTENSION_MESSAGE_CHANNEL_ERROR = 'message channel closed before a response was received';

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = typeof reason === 'string' ? reason : reason?.message;
  if (typeof message !== 'string' || !message.includes(EXTENSION_MESSAGE_CHANNEL_ERROR)) return;
  event.preventDefault();
  console.debug('[TravelAI] Ignored a browser-extension message channel rejection:', message);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
