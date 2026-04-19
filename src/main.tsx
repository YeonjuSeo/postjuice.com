import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import App from '@/App';
import { RootErrorBoundary } from '@/components/root-error-boundary';
import '@/index.css';

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('Root element #root not found');
}

const app = (
  <StrictMode>
    <RootErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </RootErrorBoundary>
  </StrictMode>
);

function shouldHydrate(element: HTMLElement): boolean {
  if (element.childElementCount > 0) return true;
  const html = element.innerHTML.trim();
  return html.length > 0;
}

try {
  if (shouldHydrate(rootEl)) {
    hydrateRoot(rootEl, app);
  } else {
    createRoot(rootEl).render(app);
  }
} catch (error) {
  console.error(error);
  const message = error instanceof Error ? error.message : String(error);
  rootEl.replaceChildren();
  const wrap = document.createElement('div');
  wrap.style.padding = '2rem';
  wrap.style.fontFamily = 'system-ui, sans-serif';
  wrap.style.maxWidth = '40rem';
  const h1 = document.createElement('h1');
  h1.style.marginTop = '0';
  h1.textContent = '앱을 시작하지 못했습니다';
  const p = document.createElement('p');
  p.textContent = '아래 메시지를 복사해 두면 원인 파악에 도움이 됩니다.';
  const pre = document.createElement('pre');
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.background = '#f1f5f9';
  pre.style.padding = '1rem';
  pre.style.borderRadius = '8px';
  pre.textContent = message;
  wrap.append(h1, p, pre);
  rootEl.append(wrap);
}
