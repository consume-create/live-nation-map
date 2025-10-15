import { useEffect } from 'react'
import GUI from 'lil-gui'

export function useFlashlightGUI(params, enabled) {
  useEffect(() => {
    if (!enabled || !params) return

    const gui = new GUI()
    gui.domElement.style.position = 'absolute'
    gui.domElement.style.top = '20px'
    gui.domElement.style.right = '20px'
    gui.domElement.style.zIndex = '200'

    const gradientFolder = gui.addFolder('Gradient')
    const gradientColors = {
      top: rgbToHex(params.colorTop),
      mid: rgbToHex(params.colorMid),
      low: rgbToHex(params.colorLow),
      bottom: rgbToHex(params.colorBottom)
    }

    gradientFolder.addColor(gradientColors, 'top').name('Top Color').onChange((value) => {
      const rgb = hexToRgb(value)
      params.colorTop.r = rgb.r
      params.colorTop.g = rgb.g
      params.colorTop.b = rgb.b
    })
    gradientFolder.addColor(gradientColors, 'mid').name('Mid Color').onChange((value) => {
      const rgb = hexToRgb(value)
      params.colorMid.r = rgb.r
      params.colorMid.g = rgb.g
      params.colorMid.b = rgb.b
    })
    gradientFolder.addColor(gradientColors, 'low').name('Low Color').onChange((value) => {
      const rgb = hexToRgb(value)
      params.colorLow.r = rgb.r
      params.colorLow.g = rgb.g
      params.colorLow.b = rgb.b
    })
    gradientFolder.addColor(gradientColors, 'bottom').name('Bottom Color').onChange((value) => {
      const rgb = hexToRgb(value)
      params.colorBottom.r = rgb.r
      params.colorBottom.g = rgb.g
      params.colorBottom.b = rgb.b
    })
    gradientFolder.add(params, 'colorExponent', 0.1, 3, 0.01).name('Exponent')
    gradientFolder.add(params, 'midPosition', 0.1, 0.9, 0.01).name('Mid Position').onChange((value) => {
      if (params.lowPosition >= value) {
        params.lowPosition = Math.max(value - 0.05, 0.01)
      }
    })
    gradientFolder.add(params, 'lowPosition', 0.0, 0.8, 0.01).name('Low Position').onChange((value) => {
      if (value >= params.midPosition) {
        params.midPosition = Math.min(value + 0.05, 0.95)
      }
    })

    const flashlightFolder = gui.addFolder('Flashlight')
    flashlightFolder.add(params, 'flashlightRadius', 0.05, 1.5, 0.01).name('Radius')
    flashlightFolder.add(params, 'flashlightFeather', 0.05, 1.0, 0.01).name('Feather')
    flashlightFolder.add(params, 'flashlightIntensity', 0.2, 5.0, 0.05).name('Intensity')
    flashlightFolder.add(params, 'ambientAlpha', 0.0, 1.0, 0.01).name('Ambient Alpha')

    const flashlightColor = { color: rgbToHex(params.flashlightColor) }
    flashlightFolder.addColor(flashlightColor, 'color').name('Beam Color').onChange((value) => {
      const rgb = hexToRgb(value)
      params.flashlightColor.r = rgb.r
      params.flashlightColor.g = rgb.g
      params.flashlightColor.b = rgb.b
    })

    const sweepFolder = gui.addFolder('Sweep')
    sweepFolder.add(params, 'flashlightAutoSpeed', 0.05, 2.0, 0.01).name('Speed')
    sweepFolder.add(params, 'flashlightAutoY', -1, 1, 0.01).name('Vertical Offset')

    gradientFolder.open()
    flashlightFolder.open()
    sweepFolder.open()

    return () => {
      gui.destroy()
    }
  }, [enabled, params])
}

function rgbToHex(color) {
  const r = clamp(Math.round(color.r), 0, 255)
  const g = clamp(Math.round(color.g), 0, 255)
  const b = clamp(Math.round(color.b), 0, 255)
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    return { r: 255, g: 255, b: 255 }
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  }
}

function toHex(value) {
  return value.toString(16).padStart(2, '0')
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
