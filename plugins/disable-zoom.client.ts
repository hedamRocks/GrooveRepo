/**
 * iOS Safari / Chrome-on-iOS ignore `user-scalable=no` in the viewport meta,
 * so pinch-zoom stays enabled. Block it explicitly via the gesture events.
 * (Double-tap zoom is handled by `touch-action: manipulation` in main.css.)
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const prevent = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', prevent, { passive: false })
  document.addEventListener('gesturechange', prevent, { passive: false })
  document.addEventListener('gestureend', prevent, { passive: false })
})
