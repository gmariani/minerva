/* eslint-env browser */
/* global self, caches, fetch, URL, Promise, Response */
// https://github.com/lyzadanger/serviceworker-example 1/28/2018
('use strict');

const config = {
    version: '4.2.1.%BUILD%',
    staticCacheItems: [
        'img/Mega_Man_Running.gif',
        'img/favicon-196x196.png',
        'img/throbber.gif',
        'img/32px.png',
        'img/icons/bug.png',
        'img/icons/time.png',
        'css/bundle.css',
        'font/Lato-Regular.woff',
        'js/bundle.js',
        'js/lib/ByteArray.js',
        'js/lib/AMF0.js',
        'js/lib/AMF3.js',
        'js/parsers/SOLReaderWorker.js',
        'js/parsers/SOLWriterWorker.js',
        './',
    ],
    cachePathPattern: /\/(?:(css|img|js)\/(.+)?)?$/,
    offlineImage:
        '<svg role="img" aria-labelledby="offline-title"' +
        ' viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">' +
        '<title id="offline-title">Offline</title>' +
        '<g fill="none" fill-rule="evenodd"><path fill="#D8D8D8" d="M0 0h400v300H0z"/>' +
        '<text fill="#9B9B9B" font-family="Times New Roman,Times,serif" font-size="72" font-weight="bold">' +
        '<tspan x="93" y="172">offline</tspan></text></g></svg>',
    offlinePage: '/offline/',
};

function cacheName(key, opts) {
    return `${opts.version}-${key}`;
}

function addToCache(cacheKey, request, response) {
    if (response.ok) {
        const copy = response.clone();
        caches.open(cacheKey).then(cache => {
            cache.put(request, copy);
        });
    }
    return response;
}

function fetchFromCache(event) {
    return caches.match(event.request).then(response => {
        if (!response) {
            console.error(`${event.request.url} not found in cache`);
            throw Error(`${event.request.url} not found in cache`);
        }
        return response;
    });
}

function offlineResponse(resourceType, opts) {
    if (resourceType === 'image') {
        return new Response(opts.offlineImage, {
            headers: { 'Content-Type': 'image/svg+xml' },
        });
    } else if (resourceType === 'content') {
        return caches.match(opts.offlinePage);
    }
    return undefined;
}

self.addEventListener('install', event => {
    function onInstall(event, opts) {
        return caches
            .open(cacheName('static', opts))
            .then(cache => cache.addAll(opts.staticCacheItems));
    }

    event.waitUntil(onInstall(event, config).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    function onActivate(event, opts) {
        return caches.keys().then(cacheKeys => {
            const oldCacheKeys = cacheKeys.filter(
                key => key.indexOf(opts.version) !== 0
            );
            console.log('onActivate');
            console.log(oldCacheKeys);
            const deletePromises = oldCacheKeys.map(oldKey =>
                caches.delete(oldKey)
            );
            return Promise.all(deletePromises);
        });
    }

    event.waitUntil(onActivate(event, config).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
    function shouldHandleFetch(event, opts) {
        const request = event.request;
        const url = new URL(request.url);
        console.log('shouldFetch --------');
        console.log(`shouldFetch Path? ${url.pathname}`);
        console.log(
            `shouldFetch Origin? ${url.origin} === ${self.location.origin}`
        );
        const criteria = {
            matchesPathPattern: opts.cachePathPattern.test(url.pathname),
            isGETRequest: request.method === 'GET',
            isFromMyOrigin:
                url.origin === self.location.origin ||
                'https://cdn.mariani.life' === url.origin,
        };
        const failingCriteria = Object.keys(criteria).filter(
            criteriaKey => !criteria[criteriaKey]
        );
        console.log(`Fetch from cache? ${!failingCriteria.length}`);
        return !failingCriteria.length;
    }

    function onFetch(event, opts) {
        const request = event.request;
        const acceptHeader = request.headers.get('Accept');
        const resourceType =
            acceptHeader.indexOf('text/html') !== -1
                ? 'content'
                : acceptHeader.indexOf('image') !== -1 ? 'image' : 'static';
        const cacheKey = cacheName(resourceType, opts);

        if (resourceType === 'content') {
            event.respondWith(
                fetch(request)
                    .then(response => addToCache(cacheKey, request, response))
                    .catch(() => fetchFromCache(event))
                    .catch(() => offlineResponse(resourceType, opts))
            );
        } else {
            event.respondWith(
                fetchFromCache(event)
                    .catch(() => fetch(request))
                    .then(response => addToCache(cacheKey, request, response))
                    .catch(() => offlineResponse(resourceType, opts))
            );
        }
    }
    if (shouldHandleFetch(event, config)) {
        onFetch(event, config);
    }
});
