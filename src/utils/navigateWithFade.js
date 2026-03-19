/**
 * Navigate to a route with a body opacity fade transition.
 * Each call cancels any pending fade from a previous invocation.
 * @param {Function} navigate - React Router navigate function
 * @param {string} path - Target route path
 */
let _outer = null
let _inner = null
let _raf = null

export function navigateWithFade(navigate, path) {
  clearTimeout(_outer)
  clearTimeout(_inner)
  cancelAnimationFrame(_raf)

  document.body.style.transition = 'opacity 0.3s ease'
  document.body.style.opacity = '0'
  _outer = setTimeout(() => {
    window.scrollTo({ top: 0 })
    navigate(path)
    _inner = setTimeout(() => {
      _raf = requestAnimationFrame(() => {
        document.body.style.opacity = '1'
      })
    }, 100)
  }, 350)
}
