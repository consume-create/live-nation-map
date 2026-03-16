import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAudioPlaylist } from '../services/mapPoints'

// ── Module-level audio singleton (persists across route changes) ──
const audio = new Audio()
audio.loop = false
audio.volume = parseFloat(localStorage.getItem('ln-audio-volume') ?? '0.2')

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
  return new Promise((resolve) => {
    if (audio.readyState >= 3) return resolve()
    const handler = () => {
      audio.removeEventListener('canplay', handler)
      resolve()
    }
    audio.addEventListener('canplay', handler)
  })
}

async function initAudio() {
  if (initialized || initializing) return initialized
  initializing = true

  try {
    // Try Sanity CMS first
    const sanityTracks = await fetchAudioPlaylist()

    if (sanityTracks.length > 0) {
      trackList = shuffle(sanityTracks.map((t) => t.url))
      currentTrackIndex = 0
      audio.src = trackList[0]
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
    audio.src = trackList[0]
    initialized = true
  } catch {
    initializing = false
    return false
  }

  initializing = false
  return true
}

function loadNextTrack() {
  if (trackList.length === 0) return
  currentTrackIndex++
  // Re-shuffle when we've played all tracks, avoiding repeat of last track
  if (currentTrackIndex >= trackList.length) {
    const lastTrack = trackList[trackList.length - 1]
    do {
      trackList = shuffle(trackList)
    } while (trackList.length > 1 && trackList[0] === lastTrack)
    currentTrackIndex = 0
  }
  audio.src = trackList[currentTrackIndex]
  waitForCanPlay().then(() => audio.play().catch(() => {}))
}

// Auto-advance when track ends
audio.addEventListener('ended', loadNextTrack)

// ── React hook ──
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(audio.volume)
  const [hasInteracted, setHasInteracted] = useState(false)
  const interactedRef = useRef(false)

  useEffect(() => {
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onVolume = () => setVolumeState(audio.volume)

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('volumechange', onVolume)

    // Sync initial state
    setIsPlaying(!audio.paused)
    setVolumeState(audio.volume)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('volumechange', onVolume)
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
    if (audio.paused) {
      await waitForCanPlay()
      try { await audio.play() } catch { /* autoplay blocked */ }
    }
  }, [markInteracted])

  // Toggle play/pause (for music icon click)
  const togglePlayPause = useCallback(async () => {
    markInteracted()
    const ok = await initAudio()
    if (!ok) return

    if (audio.paused) {
      await waitForCanPlay()
      try { await audio.play() } catch { /* autoplay blocked */ }
    } else {
      audio.pause()
    }
  }, [markInteracted])

  const setVolume = useCallback((v) => {
    markInteracted()
    const clamped = Math.max(0, Math.min(1, v))
    audio.volume = clamped
    localStorage.setItem('ln-audio-volume', String(clamped))
  }, [markInteracted])

  return { isPlaying, volume, togglePlayPause, startPlayback, setVolume, hasInteracted }
}
