/* eslint-env browser */
/* global self, caches, fetch, URL, Promise, Response, request */
var version = 'v4.2.0a::',
    offlineFundamentals = ['.', 'css/main.css', 'js/main.min.js'];

self.addEventListener('install', function installer(evt) {
    evt.waitUntil(
        caches.open(version + 'fundamentals').then(function prefill(cache) {
            return cache.addAll(offlineFundamentals);
        })
    );
});

self.addEventListener('activate', function activator(evt) {
    evt.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys
                    .filter(function(key) {
                        return key.indexOf(version) !== 0;
                    })
                    .map(function(key) {
                        return caches.delete(key);
                    })
            );
        })
    );
});

self.addEventListener('fetch', function fetcher(evt) {
    var request = evt.request;
    if (request.method !== 'GET') {
        evt.respondWith(fetch(request));
        return;
    }

    // handle other requests
    evt.respondWith(caches.match(request).then(queriedCache));
});

function queriedCache(cached) {
    var networked = fetch(request)
        .then(fetchedFromNetwork, unableToResolve)
        .catch(unableToResolve);
    return cached || networked;
}

function fetchedFromNetwork(response) {
    var clonedResponse = response.clone();
    caches.open(version + 'pages').then(function add(cache) {
        cache.put(request, clonedResponse);
    });
    return response;
}

function unableToResolve() {
    //var url = new URL(request.url),
    var accepts = request.headers.get('Accept');

    // Is an image?
    /* if (accepts.indexOf('image') !== -1) {
        // Default gravatar
        /*if (url.host === 'www.gravatar.com') {
			return caches.match(mysteryMan);
		}
        // Default image placeholder
        return caches.match(rainbows);
}*/

    /*if (url.origin === location.origin) {
		return caches.match('/offline');
	}*/
    return offlineResponse();
}

function offlineResponse() {
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
}
