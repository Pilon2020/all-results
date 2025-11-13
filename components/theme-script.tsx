import Script from "next/script"

const THEME_STORAGE_KEY = "rt-color-scheme"

const script = `
;(function() {
  var root = document.documentElement
  if (!root) return
  var mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null
  var getSystemTheme = function () {
    return mediaQuery && mediaQuery.matches ? "dark" : "light"
  }
  var applyTheme = function (next) {
    var theme = next === "dark" ? "dark" : "light"
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    root.style.colorScheme = theme
  }
  try {
    var persisted = localStorage.getItem("${THEME_STORAGE_KEY}")
    if (persisted === "light" || persisted === "dark") {
      localStorage.removeItem("${THEME_STORAGE_KEY}")
    }
  } catch (error) {}
  var syncSystemPreference = function (event) {
    var matchesDark = event && typeof event.matches === "boolean" ? event.matches : getSystemTheme() === "dark"
    applyTheme(matchesDark ? "dark" : "light")
  }
  syncSystemPreference()
  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncSystemPreference)
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(syncSystemPreference)
    }
  }
})()
`

export function ThemeScript() {
  return <Script id="rt-theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: script }} />
}
