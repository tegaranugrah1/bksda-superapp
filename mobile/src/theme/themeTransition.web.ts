import { flushSync } from 'react-dom';

let activeTransition: ViewTransition | null = null;

export function cancelThemeTransition() {
  activeTransition?.skipTransition();
  activeTransition = null;
}

/** Same radial View Transition used by the main web app, for the Expo web preview. */
export function startThemeTransition(update: () => void, origin?: { x: number; y: number }): boolean {
  if (!document.startViewTransition) return false;

  activeTransition?.skipTransition();
  const style = document.createElement('style');
  style.textContent = `
    ::view-transition-old(root), ::view-transition-new(root) {
      animation: none;
      mix-blend-mode: normal;
    }
    ::view-transition-old(root) { z-index: 1; }
    ::view-transition-new(root) { z-index: 9999; }
  `;
  document.head.appendChild(style);
  const x = origin ? origin.x - window.scrollX : window.innerWidth / 2;
  const y = origin ? origin.y - window.scrollY : window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  let applied = false;
  const apply = () => {
    if (applied) return;
    applied = true;
    flushSync(update);
  };

  try {
    const transition = document.startViewTransition(apply);
    activeTransition = transition;
    void transition.ready.then(() => {
      if (activeTransition !== transition) return;
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(apply);
    void transition.finished.catch(() => {}).finally(() => {
      style.remove();
      if (activeTransition === transition) activeTransition = null;
    });
    return true;
  } catch {
    style.remove();
    return false;
  }
}
