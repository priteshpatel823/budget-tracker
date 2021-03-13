const CACHE_NAME = "static-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";
const FILES_TO_CACHE = [
    "/",
    "index.html",
    "index.js",
    "styles.css",
    "manifest.webmanifest",
    "db.js",
    "./icons/icon-192x192.png",
    "./icons/icon-512x512.png",
    "https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"


];

// install
self.addEventListener("install", function (evt) {

    console.log("install");

    // pre cache transaction data
    const cacheImageData = async () => {
        const cache = await caches.open(DATA_CACHE_NAME);
        return cache.add("/api/transaction");
    }

    // pre cache all static assets
    const cacheResources = async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.addAll(FILES_TO_CACHE);
    }

    evt.waitUntil(cacheImageData());

    evt.waitUntil(cacheResources());

    // tell the browser to activate this service worker immediately once it
    // has finished installing
    self.skipWaiting();

});

// activate
self.addEventListener("activate", function (evt) {

    console.log("activate");

    const removeOldCache = async () => {
        const cacheKeyArray = await caches.keys();

        const cacheResultPromiseArray = cacheKeyArray.map(key => {
            if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                console.log("Removing old cache data", key);
                return caches.delete(key);
            }
        });
        return Promise.all(cacheResultPromiseArray);
    }

    evt.waitUntil(removeOldCache());

    self.clients.claim();
});

// fetch
self.addEventListener("fetch", function (evt) {

    const handleAPIDataRequest = async (evt) => {
        try {
            const response = await fetch(evt.request);
            // If the response was good, clone it and store it in the cache.
            if (response.status === 200) {
                console.log(`Adding API request to cache now: ${evt.request.url}`);

                const apiCache = await caches.open(DATA_CACHE_NAME);
                await apiCache.put(evt.request.url, response.clone());

                return response;
            }
        } catch (error) {
            // Network request failed, try to get it from the cache.
            console.log(`Network error occurred with API request. Now retrieving it from the cache: ${evt.request.url}`)
            return await caches.match(evt.request);
        }
    }

    const handleResourceRequest = async (evt) => {
        const matchedCache = await caches.match(evt.request);
        return matchedCache || await fetch(evt.request);
    }

    if (evt.request.url.includes("/api/")) {
        evt.respondWith(handleAPIDataRequest(evt));
    } else {
        evt.respondWith(handleResourceRequest(evt));
    }
});