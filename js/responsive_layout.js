window.App = window.App || {};

App.ResponsiveLayout = (() => {
  'use strict';
  let resizeTimer = null;

  function syncViewportVars() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  }

  function getTier(width = window.innerWidth) {
    if (width <= 640) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  function applyBodyTier() {
    const tier = getTier();
    document.body.dataset.viewportTier = tier;
    syncViewportVars();
    const preview = document.querySelector('.preview.active');
    if (preview) preview.style.minHeight = `calc(var(--app-vh, 1vh) * 100)`;
    return tier;
  }

  function init() {
    applyBodyTier();
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => applyBodyTier(), 120);
    }, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(() => applyBodyTier(), 60), { passive: true });
  }

  return { getTier, applyBodyTier, init };
})();
