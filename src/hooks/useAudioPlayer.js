import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAudioPlaylist } from '../services/mapPoints'

// ── Module-level audio singleton (persists across route changes) ──
let audio = null

function getAudio() {
  if (!audio && typeof window !== 'undefined') {
    audio = new Audio()
    audio.loop = false
    audio.volume = parseFloat(localStorage.getItem('ln-audio-volume') ?? '0.2')
    audio.addEventListener('ended', loadNextTrack)
  }
  return audio
}

// trackList stores full URLs (Sanity CDN or local paths)
let trackList = []
let currentTrackIndex = -1
let initialized = false
let initializing = false

const BASE = import.meta.env.BASE_URL || '/'

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Returns a promise that resolves when audio is ready to play
function waitForCanPlay() {
  return new Promise((resolve, reject) => {
    const a = getAudio()
    if (!a) return reject(new Error('no audio'))
    if (a.readyState >= 3) return resolve()

    let settled = false
    const cleanup = () => {
      a.removeEventListener('canplay', onReady)
      a.removeEventListener('error', onErr)
    }
    const onReady = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }
    const onErr = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('audio load failed'))
    }

    a.addEventListener('canplay', onReady)
    a.addEventListener('error', onErr)

    // Prevent hanging forever on broken sources
    setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('audio load timeout'))
    }, 10000)
  })
}

async function initAudio() {
  if (initialized || initializing) return initialized
  initializing = true
  const a = getAudio()
  if (!a) { initializing = false; return false }

  try {
    // Try Sanity CMS first
    const sanityTracks = await fetchAudioPlaylist()

    if (sanityTracks.length > 0) {
      trackList = shuffle(sanityTracks.map((t) => t.url))
      currentTrackIndex = 0
      a.src = trackList[0]
      initialized = true
      initializing = false
      return true
    }

    // Fallback to local manifest
    const res = await fetch(`${BASE}audio/manifest.json`)
    const manifest = await res.json()

    if (!Array.isArray(manifest) || manifest.length === 0) {
      initializing = false
      return false
    }

    trackList = shuffle(manifest.map((f) => `${BASE}audio/${f}`))
    currentTrackIndex = 0
    a.src = trackList[0]
    initialized = true
  } catch {
    initializing = false
    return false
  }

  initializing = false
  return true
}

function loadNextTrack() {
  const a = getAudio()
  if (!a || trackList.length === 0) return
  currentTrackIndex++
  // Re-shuffle when we've played all tracks, avoiding repeat of last track
  if (currentTrackIndex >= trackList.length) {
    const lastTrack = trackList[trackList.length - 1]
    let attempts = 0
    do {
      trackList = shuffle(trackList)
      attempts++
    } while (trackList.length > 1 && trackList[0] === lastTrack && attempts < 10)
    currentTrackIndex = 0
  }
  a.src = trackList[currentTrackIndex]
  waitForCanPlay()
    .then(() => a.play().catch(() => {}))
    .catch(() => {}) // skip track on load failure
}

// ── React hook ──
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(() => getAudio()?.volume ?? 0.2)
  const [hasInteracted, setHasInteracted] = useState(false)
  const interactedRef = useRef(false)

  useEffect(() => {
    const a = getAudio()
    if (!a) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onVolume = () => setVolumeState(a.volume)

    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('volumechange', onVolume)

    // Sync initial state
    setIsPlaying(!a.paused)
    setVolumeState(a.volume)

    return () => {
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('volumechange', onVolume)
    }
  }, [])

  const markInteracted = useCallback(() => {
    if (!interactedRef.current) {
      interactedRef.current = true
      setHasInteracted(true)
    }
  }, [])

  // Start playback (for hotspot click — only starts, never pauses)
  const startPlayback = useCallback(async () => {
    markInteracted()
    const ok = await initAudio()
    if (!ok) return
    const a = getAudio()
    if (!a) return
    if (a.paused) {
      try {
        await waitForCanPlay()
        await a.play()
      } catch { /* autoplay blocked or load failed */ }
    }
  }, [markInteracted])

  // Toggle play/pause (for music icon click)
  const togglePlayPause = useCallback(async () => {
    markInteracted()
    const ok = await initAudio()
    if (!ok) return
    const a = getAudio()
    if (!a) return

    if (a.paused) {
      try {
        await waitForCanPlay()
        await a.play()
      } catch { /* autoplay blocked or load failed */ }
    } else {
      a.pause()
    }
  }, [markInteracted])

  const setVolume = useCallback((v) => {
    markInteracted()
    const a = getAudio()
    if (!a) return
    const clamped = Math.max(0, Math.min(1, v))
    a.volume = clamped
    localStorage.setItem('ln-audio-volume', String(clamped))
  }, [markInteracted])

  return { isPlaying, volume, togglePlayPause, startPlayback, setVolume, hasInteracted }
}
