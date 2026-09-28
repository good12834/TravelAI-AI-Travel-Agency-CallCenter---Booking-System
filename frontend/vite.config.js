import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

// The Flask dev server (backend/run.py) binds host='0.0.0.0', i.e. IPv4 only.
// On Windows `localhost` resolves to ::1 first, so a `localhost:5000` target makes
// Node's happy-eyeballs (autoSelectFamily) dial ::1, get ECONNREFUSED and only then
// retry 127.0.0.1 — that failed first attempt is exactly the `internalConnectMultiple`
// frame in the "[vite] http proxy error: /api/..." stack. Pinning the target to
// 127.0.0.1 skips the dead IPv6 hop and makes every proxied request deterministic.
const BACKEND_TARGET = 'http://127.0.0.1:5000'

// Socket-level failures that are normal churn against a dev server: the browser
// aborting a stale polling -> websocket upgrade or closing a socket mid-write
// (HMR / StrictMode remount / tab reload). They self-heal on the next poll or
// Socket.IO reconnect, so they must not produce log noise.
const TRANSIENT_SOCKET_CODES = ['ECONNABORTED', 'ECONNRESET', 'EPIPE', 'ERR_STREAM_DESTROYED']

// Vite registers its OWN proxy listeners right after `configure` and logs a raw stack
// for every flavour of failure (node_modules/vite/dist/node/chunks/dep-*.js):
//   "http proxy error: <url>\n<stack>"   (34837 — upstream HTTP request refused/aborted)
//   "ws proxy error:\n<stack>"           (34850 — websocket upgrade refused/aborted)
//   "ws proxy socket error:\n<stack>"    (34862 — proxied socket closed mid-write)
//   "ws proxy bypass error:\n<stack>"    (34903 — a `bypass` hook threw; we have none)
// Reuse the standard logger but drop the first three when the underlying socket error is
// transient churn (already explained by our own single-line handler) or ECONNREFUSED
// (already reported once per outage below). Every other proxy error keeps Vite's full
// diagnostic output.
// NOTE: all three strings are required — "ws proxy socket error" does NOT contain
// "ws proxy error". The missing `ws proxy error` entry is what let a raw
// "Error: read ECONNRESET" stack leak into the dev console:
//   [vite] ws proxy error:
//   Error: read ECONNRESET  at TCP.onStreamRead (node:internal/stream_base_commons:216:20)
const VITE_PROXY_LOG_LINES = [
  'http proxy error',
  'ws proxy error',
  'ws proxy socket error',
]
const SILENCED_LOG_CODES = [...TRANSIENT_SOCKET_CODES, 'ECONNREFUSED']

const logger = createLogger()
const logError = logger.error
logger.error = (msg, options) => {
  const code = options?.error?.code
  if (
    typeof msg === 'string' &&
    VITE_PROXY_LOG_LINES.some((line) => msg.includes(line)) &&
    SILENCED_LOG_CODES.includes(code)
  ) return
  logError.call(logger, msg, options)
}

// Dev-only failure handling. The messages below carry no "[vite]" prefix: they now go
// through Vite's logger, which adds its own tag + timestamp (keeping the manual prefix
// produced the old "[vite] [vite] ws: ..." output).
// 1. ECONNREFUSED means the backend was not listening at that instant — typically a
//    Flask debug-reloader restart, or run.py being started after the browser tab was
//    already polling /api/calls/live. It is reported ONCE per outage: a single Socket.IO
//    reconnect storm fires many attempts (polling + websocket upgrade) and one identical
//    line per attempt buries the one actionable message. Later refusals are counted and
//    only summarised when the backend answers again, and the window is closed by the
//    first successful upstream hop (HTTP response or websocket upgrade).
// 2. Transient aborts from a stale polling -> websocket upgrade (HMR / StrictMode
//    remount / tab reload) on the Werkzeug dev server stay silent.
// 3. Anything else is a real proxy error and is reported.
const createProxyErrorHandler = (label) => {
  let outage = false
  let suppressed = 0

  // A successful hop proves the backend is up: close the outage window, printing the
  // recovery summary only when we actually warned about this outage.
  const markReachable = () => {
    if (!outage) return
    outage = false
    const retries = suppressed
      ? ` after ${suppressed} further failed attempt${suppressed === 1 ? '' : 's'}`
      : ''
    suppressed = 0
    logger.info(
      `${label}: backend reachable again at ${BACKEND_TARGET}${retries}`,
      { timestamp: true }
    )
  }

  return (proxy) => {
    proxy.on('error', (err, _req, res) => {
      if (TRANSIENT_SOCKET_CODES.includes(err.code)) return
      if (err.code === 'ECONNREFUSED') {
        if (outage) {
          suppressed += 1
        } else {
          outage = true
          logger.warn(
            `${label}: backend not reachable at ${BACKEND_TARGET} — ` +
            'is `python run.py` running in backend/ ?',
            { timestamp: true }
          )
        }
      } else {
        logger.error(`${label}: proxy error: ${err.message}`, { timestamp: true })
      }
      // Fail fast for HTTP requests so axios / Socket.IO polling receives a real 502
      // instead of an empty response. For websocket upgrades `res` is a raw socket (no
      // writeHead) — leave it alone.
      if (res && typeof res.writeHead === 'function' && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          error: 'backend_unavailable',
          message: 'Backend API is not reachable yet. Retrying shortly.',
        }))
      }
    })

    proxy.on('proxyRes', markReachable) // an HTTP request reached the backend
    proxy.on('open', markReachable)     // a websocket upgrade to the backend succeeded
  }
}

// https://vite.dev/config/
export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  server: {
    port: 5173,
    // Increase stability of the dev-time proxy to Flask-SocketIO.
    // The backend dev server (Werkzeug) handles one WS upgrade at a time;
    // when the browser aborts a stale polling->websocket upgrade (HMR /
    // StrictMode remount / tab reload) http-proxy logs ECONNABORTED.
    // Longer timeouts + polling-first client transport (see SocketContext)
    // make those aborts rare and harmless.
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
        configure: createProxyErrorHandler('api'),
      },
      '/socket.io': {
        target: BACKEND_TARGET,
        ws: true,
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
        // Silence transient socket errors (stale WS after HMR / tab reload)
        configure: createProxyErrorHandler('ws'),
      },
    },
  },
})
