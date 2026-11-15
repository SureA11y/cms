// A jsdom window as the browser globals the panel's UI needs.
import { JSDOM } from 'jsdom';

export function installDom(html = '<!doctype html><html lang="en"><body></body></html>') {
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const { window } = dom;
  for (const key of ['window', 'document', 'HTMLElement', 'customElements', 'CustomEvent', 'Node']) {
    globalThis[key] = key === 'window' ? window : window[key];
  }
  return window;
}
