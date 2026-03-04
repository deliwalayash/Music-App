const CACHE_NAME = 'gym-timer-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './audio/Relax21.mp3',
    './audio/hitslab-sport-gym-workout-music-333740.mp3',
    './audio/mfcc-gym-workout-sport-music-412786.mp3',
    './audio/the_mountain-gym-199166.mp3',
    './audio/delosound-energetic-sports-442840.mp3',
    './audio/paulyudin-sport-sport-music-490393.mp3',
    './audio/watermello-sport-sport-music-477142.mp3'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
