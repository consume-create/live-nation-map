/**
 * Navigate to a route with a body opacity fade transition.
 * @param {Function} navigate - React Router navigate function
 * @param {string} path - Target route path
 */
export function navigateWithFade(navigate, path) {
  document.body.style.transition = 'opacity 0.3s ease'
  document.body.style.opacity = '0'
  setTimeout(() => {
    window.scrollTo({ top: 0 })
    navigate(path)
    setTimeout(() => {
      requestAnimationFrame(() => {
        document.body.style.opacity = '1'
      })
    }, 100)
  }, 350)
}
