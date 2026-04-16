import { StrictMode, Component, useState, useEffect, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './tokens.css'
import App from './App.jsx'

const GCPortal       = lazy(() => import('./components/GCPortal.jsx'));
const JobPortal      = lazy(() => import('./components/JobPortal.jsx'));
const CustomerPortal = lazy(() => import('./components/CustomerPortal.jsx'));
const TakeoffRoute   = lazy(() => import('./routes/TakeoffRoute.jsx'));
const PrivacyPolicy  = lazy(() => import('./components/PrivacyPolicy.jsx'));

function Router() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (hash === '#/gc-portal') {
    return <Suspense fallback={<div className="p-sp10 c-amber" style={{ background: "var(--bg)",minHeight:'100vh' }}>Loading...</div>}><GCPortal /></Suspense>;
  }
  if (hash === '#/careers') {
    return <Suspense fallback={<div className="p-sp10 c-amber" style={{ background: "var(--bg)",minHeight:'100vh' }}>Loading...</div>}><JobPortal /></Suspense>;
  }
  if (hash === '#/customer-portal') {
    return <Suspense fallback={<div className="p-sp10 c-amber" style={{ background: "var(--bg)",minHeight:'100vh' }}>Loading...</div>}><CustomerPortal /></Suspense>;
  }
  if (hash.startsWith('#/takeoff/')) {
    return <Suspense fallback={<div className="p-sp10 c-amber" style={{ background: "var(--bg)",minHeight:'100vh' }}>Loading takeoff...</div>}><TakeoffRoute /></Suspense>;
  }
  if (hash === '#/privacy' || hash === '#/privacy-policy') {
    return <Suspense fallback={<div className="p-sp10 c-amber" style={{ background: "var(--bg)",minHeight:'100vh' }}>Loading...</div>}><PrivacyPolicy /></Suspense>;
  }
  return <App />;
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('APP CRASH:', error.message, error.stack); }
  render() {
    if (this.state.error) return (
      <div className="p-sp10 bg-bg2" style={{ color:'#ff6b6b',minHeight:'100vh',fontFamily:'monospace' }}>
        <h2>EBC Error</h2>
        <pre style={{whiteSpace:'pre-wrap',color:'#ffa'}}>{this.state.error.message}</pre>
        <pre className="fs-label c-text2" style={{ whiteSpace:'pre-wrap' }}>{this.state.error.stack}</pre>
        <button onClick={()=>location.reload()} className="rounded-control fw-bold mt-sp5" style={{ padding:'8px 20px',background: "var(--amber)",border:'none',color:'#000',cursor:'pointer' }}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  </StrictMode>,
)

// Fade out splash screen after React mounts + minimum 1.5s display
const splashStart = window.__splashStart || Date.now();
requestAnimationFrame(() => {
  const splash = document.getElementById('splash');
  if (splash) {
    const elapsed = Date.now() - splashStart;
    const remaining = Math.max(0, 1500 - elapsed);
    setTimeout(() => {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 600);
    }, remaining);
  }
});

// Register service worker for PWA (skip in dev to avoid caching Vite bundles)
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates every 30 minutes
      setInterval(() => reg.update(), 30 * 60 * 1000);
    }).catch(() => {});
  });
}
