import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('APP CRASH:', error.message, error.stack); }
  render() {
    if (this.state.error) return (
      <div style={{padding:40,color:'#ff6b6b',background:'#111',minHeight:'100vh',fontFamily:'monospace'}}>
        <h2>EBC-OS Error</h2>
        <pre style={{whiteSpace:'pre-wrap',color:'#ffa'}}>{this.state.error.message}</pre>
        <pre style={{whiteSpace:'pre-wrap',color:'#888',fontSize:12}}>{this.state.error.stack}</pre>
        <button onClick={()=>location.reload()} style={{marginTop:20,padding:'8px 20px',background:'#e09422',border:'none',borderRadius:6,color:'#000',fontWeight:700,cursor:'pointer'}}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Fade out splash screen after React mounts
requestAnimationFrame(() => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 400);
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
