import { useEffect } from 'react'
import GUI from 'lil-gui'

export function useFlashlightPlaneGUI(params, enabled) {
  useEffect(() => {
    if (!enabled || !params) return

    const gui = new GUI()
    gui.domElement.style.position = 'absolute'
    gui.domElement.style.top = '20px'
    gui.domElement.style.right = '20px'
    gui.domElement.style.zIndex = '200'

    const spotlightFolder = gui.addFolder('Spotlight')
    spotlightFolder.add(params, 'radius', 0.05, 1.5, 0.01).name('Radius')
    spotlightFolder.add(params, 'feather', 0.02, 1.0, 0.01).name('Feather')
    spotlightFolder.add(params, 'intensity', 0.1, 6.0, 0.05).name('Intensity')
    spotlightFolder.add(params, 'ambient', 0.0, 1.0, 0.01).name('Ambient')

    const sweepFolder = gui.addFolder('Sweep')
    sweepFolder.add(params, 'sweepSpeed', 0.05, 2.0, 0.01).name('Speed')
    sweepFolder.add(params, 'pingPong').name('Ping-Pong')
    sweepFolder
      .add(params, 'sweepMin', 0.0, 1.0, 0.01)
      .name('Start X')
      .onChange((value) => {
        if (value > params.sweepMax) {
          params.sweepMax = value
        }
      })
    sweepFolder
      .add(params, 'sweepMax', 0.0, 1.0, 0.01)
      .name('End X')
      .onChange((value) => {
        if (value < params.sweepMin) {
          params.sweepMin = value
        }
      })
    sweepFolder.add(params, 'sweepY', 0.0, 1.0, 0.01).name('Y Position')

    spotlightFolder.open()
    sweepFolder.open()

    return () => {
      gui.destroy()
    }
  }, [enabled, params])
}
