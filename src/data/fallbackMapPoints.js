export const fallbackMapPoints = [
  {
    _id: 'fallback-warsaw',
    title: 'Warsaw',
    slug: 'warsaw',
    state: 'New York',
    location: { lat: 40.7216, lng: -73.9572 },
    modelUrl: '/models/Live-Nation-20v2y-Warsaw.glb',
    logoUrl: '/images/warsaw.svg',
    gallery: [
      { title: 'Lobby', imageUrl: '/images/warsaw-1.png', position: { top: 25, left: 15, width: 240 } },
      { title: 'Bar', imageUrl: '/images/warsaw-2.png', position: { top: 25, right: 8, width: 230 } },
      { title: 'Restaurant', imageUrl: '/images/warsaw-3.png', position: { bottom: 18, left: 20, width: 260 } },
      { title: 'Main Stage', imageUrl: '/images/warsaw-4.png', position: { bottom: 12, right: 12, width: 250 } },
      { title: 'Backstage', imageUrl: '/images/warsaw-5.png', position: { top: 75, right: 45, width: 220 } },
    ],
    description: 'Fallback venue data when Sanity is offline.',
  },
]
