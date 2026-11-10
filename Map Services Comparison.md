Map Stack Comparator

for food delivery · Indore region · 2026

100% FREE options only

🏆

Top Pick for Indore Food Delivery

Production Architecture: Hybrid Ola Maps (Backend Proxy) + Leaflet (CartoDB Tiles)

- **Tiles & Rendering:** Leaflet.js with CartoDB Voyager tiles (100% free, 0 API quota consumption, zero key exposure).
- **Geocoding & Autocomplete:** Ola Maps Places & Reverse Geocode API via NestJS backend proxy with 350ms debounce and in-memory LRU caching (free tier: 100,000 calls/month per endpoint, supporting ~40,000 orders/month).
- **Routing:** Ola Maps Directions API for accurate road polyline geometry with cached straight-line fallback.
- **Delivery Zone Validation:** Server-side Haversine distance from Sagore Kitchen (`22.6288, 75.5684`) with ₹0 within 5km and strict 15km cutoff.

*ℹ️* A live map system for food delivery needs **4 components**: a map rendering library (what draws the map), a tile provider (the actual map images), a routing engine (calculates delivery routes), and a geocoder (converts addresses to coordinates). Each can be chosen independently.

What you need — at a glance

Four building blocks in Janki Rasoi's production stack

| Component | What it does | Production Pick | Indore / Sagore Coverage | Cost / Quota |
| --- | --- | --- | --- | --- |
| Map Library | Renders interactive map in browser | Leaflet.js (Client) | ✓ Works on any mobile browser | 100% Free |
| Tile Provider | Supplies the actual map images | CartoDB Voyager / OSM | ✓ Fast, clean vector-raster | 100% Free (0 Quota) |
| Routing Engine | Calculates delivery routes | Ola Maps Directions API | ✓ Tuned for Indian roads | 100k calls/mo free |
| Geocoder | Address → coordinates and back | Ola Maps Places & Reverse | ★ Landmark & colony aware | 100k calls/mo free |
| Live Tracking | Real-time delivery agent position | Leaflet marker + Order status | ✓ 5-10s status polling | 100% Free |


Indore OSM Coverage

OpenStreetMap data quality for the Indore area

Urban Indore

City core

Excellent

Main roads, major localities (Vijay Nagar, Palasia, AB Road, MG Road, Scheme 54), restaurants, landmarks — all well-mapped with high accuracy.

Peri-urban & Suburbs

Ring areas

Good

Areas like Rau, Kanadiya, Nipania, Bhawarkuan — road network is good; some smaller lanes and new colonies may be incomplete. Improving rapidly.

Rural surroundings

Villages beyond 20km

Fair

If you deliver beyond the city limits, Ola Maps or MapMyIndia may offer better accuracy for rural lanes and village roads in the Malwa region.

Map Rendering Libraries

These run in the browser and display the interactive map — all open-source, BSD-licensed, and free forever

Leaflet.js

Raster · JavaScript

OSS ★ Best Pick

The de facto standard for web maps. Powers Zomato, Swiggy, and thousands of delivery apps. Zero dependencies, 42k npm downloads/week. The simplest way to get a map on screen in minutes.

LicenseBSD-2-Clause (use freely, forever)

Bundle\~41KB gzipped — lightest option

TilesRaster (images) — simple, works everywhere

MobileExcellent touch support, 60fps smooth

Plugins300+ plugins: live tracking, clustering, routing

LearningVery easy — 10 lines to a working map

3D / VectorNo native 3D; vector tiles via plugin

Used byGitHub, Swiggy, Foursquare, Wikipedia

MapLibre GL JS

Vector · WebGL

OSS Modern

Open-source fork of Mapbox GL JS v1, maintained by a community. Uses WebGL for smooth 60fps rendering with vector tiles. Best for custom styled maps and 3D buildings.

LicenseBSD-2-Clause

Bundle\~750KB gzipped — heavier

TilesVector tiles — faster, smaller, styleable

MobileGood but needs WebGL (all modern phones ok)

StylingFull custom map styles (colors, fonts, icons)

LearningMedium — more config needed

3DYes — 3D buildings, terrain extrusion

Used byMapbox alternatives, GIS apps

OpenLayers

Vector + Raster · Full GIS

OSS

Most feature-complete open-source library. Supports every data format, projection, and GIS operation. Overkill for a food delivery app — complexity without benefit for this use case.

LicenseBSD-2-Clause

Bundle\~390KB gzipped (tree-shakeable)

LearningSteep — verbose API, enterprise-grade

GISBest-in-class GIS features

MobileGood but heavier than Leaflet

Best forGovernment, GIS analysis, complex data

Verdict for delivery app

*🗺️* **Use Leaflet.js.** It's the fastest to integrate, runs great on mobile, has plugins for live marker animation (delivery agent dot moving on map), clustering (restaurant pins), and polyline routing. If you later want a custom branded map style or 3D buildings, migrate to MapLibre GL — the APIs are similar enough. OpenLayers is powerful but brings unnecessary complexity.

Tile Providers

These supply the actual map images displayed by your library — the visual layer your users see

*⚠️* **Important:** OSM's own tile server (tile.openstreetmap.org) is free but has a strict [usage policy](https://operations.osmfoundation.org/policies/tiles/) — bulk/commercial use is not allowed. For a production delivery app, use one of the providers below instead.

Ola Maps Tiles

India-first · Managed

5M free/month 🇮🇳 India ★ Rec

Built on Ola's own ride data for Indian roads. Best accuracy for Indore lanes and local addresses. The 5 million free API calls/month covers tiles, routing, and geocoding combined — more than enough for a startup.

Free tier5,000,000 calls/month — all API types

India dataExcellent — built on Ola ride network

SignupYes — krutrim.com developer portal

SDKWeb, Android, iOS SDKs available

ONDC3 years FREE for ONDC startups

Stadia Maps

OSM-based · Hosted

Free tier OSM data

Took over hosting of the classic Stamen map styles (Toner, Terrain, Watercolor). Generous free tier for small production use. Clean, beautiful map styles. Good global coverage including Indore.

Free tier200,000 tile requests/month

SignupYes — free account

StylesAlidade Smooth, Toner, Outdoors, etc.

Paid$20/mo starter if you exceed free

MapTiler Cloud

Vector + Raster

Free tier

Best pairing with MapLibre GL. Provides vector tiles with custom styling via their studio. The free tier is good for development; production use may require a paid plan depending on volume.

Free tier100,000 tile requests/month (map sessions)

SignupYes — credit card not required for free

StylesStreets, Satellite, Topo, Basic + custom

Paid$25/mo Flex or $295/mo Unlimited

Protomaps / PMTiles

Self-hosted · Single file

100% OSS Free forever

The most radical free option. The entire world (or just India) is packed into one .pmtiles file you host on S3/Cloudflare R2 (\~10GB for India). No API, no limits, no cost beyond storage (\~$0.20/month on R2).

Cost\~$0.20/month storage on Cloudflare R2

RequestsUnlimited — it's your own file

SetupModerate — download India extract, upload to R2

UpdatesManual — download new file monthly

CARTO (Basemaps)

OSM-based · Hosted

Free

CartoDB's Positron, Dark Matter, and Voyager styles are freely available without an API key. Clean, minimal design — especially Positron (white) is popular for delivery apps as it doesn't distract from route overlays.

Free tierFree for non-commercial; check terms for commercial

SignupNone required for tile access

Best stylePositron (light), Dark Matter (dark)

Routing Engines

Calculate delivery routes, ETAs, and distances — all use OpenStreetMap road data for Indore

OSRM

C++ · Self-hosted

OSS Free ★ Best for delivery

Open Source Routing Machine — the fastest routing engine available. Used by Mapbox, Apple Maps (partially), and major logistics companies. A single request returns in \<10ms even for large cities. Perfect for delivery route calculation.

SpeedFastest — \<10ms per route query

Public APIrouter.project-osrm.org — free for dev/testing

Self-hostDocker-based; needs \~8GB RAM for India extract

FeaturesTurn-by-turn, waypoints, trip optimization, matrix

Multi-modalCar, bike, walk (separate profiles)

LicenseBSD-2-Clause

GraphHopper

Java · Self-hosted or API

OSS Free tier

Java-based routing engine with a hosted API (500 requests/day free) and self-hosting option. More flexible than OSRM with richer routing profiles and isochrone support. Good middle ground between ease and features.

Free API500 requests/day on hosted (low for production)

Self-hostYes — Docker available; needs \~6GB RAM

FeaturesIsochrones, matrix, custom profiles, avoid areas

SpeedSlower than OSRM for simple queries

LicenseApache 2.0

Valhalla

C++ · Self-hosted

OSS Free

Most feature-rich open-source router. Originally from MapQuest, now OSS. Best for complex scenarios: time-aware routing, elevation, multi-modal trips. Overkill for basic delivery but excellent for fleet optimization.

FeaturesIsochrones, matrix, multimodal, time-aware

SpeedSlower than OSRM; better for complex queries

Public APIStadia Maps hosts it (limited free tier)

Self-hostComplex setup; Docker available

LicenseMIT

OpenRouteService

API-first · Hosted

Free tier OSS backend

Hosted routing API built on Valhalla/OSRM. No server setup needed — just an API key. Generous free tier for small apps. Good for prototyping or apps with moderate traffic before you self-host.

Free tier2,000 requests/day, 40/min rate limit

SetupZero — just an API key, works immediately

FeaturesDirections, matrix, isochrones, geocoding

Rate limit40 req/min may be tight for peak delivery hours

Ola Maps Directions

India API · Managed

🇮🇳 India 5M free/month

Routing API with India-specific optimizations. Understands Indian road quirks, one-ways, and local lane rules better than global OSM routing. Part of the 5M free call bundle with tiles and geocoding.

India dataExcellent — tuned for Indian roads

Free tierShared 5M calls/month with other Ola APIs

SetupZero infrastructure — API key only

ControlVendor dependency — not self-hostable

Routing engine comparison

| Engine | Speed | Free public API | Self-host | India quality | Difficulty | Best for |
| --- | --- | --- | --- | --- | --- | --- |
| OSRM | ●●● Fastest | Yes (dev only) | ✓ Docker | Good (OSM data) | Medium | High-volume delivery |
| Ola Maps | ●● Fast | 5M calls/month | ✗ | Excellent | Easy | India startups |
| GraphHopper | ●● Good | 500 req/day | ✓ Java/Docker | Good (OSM data) | Medium | Flexible routing |
| OpenRouteService | ● Moderate | 2,000 req/day | ✓ Complex | Good (OSM data) | Easy (API) | Prototyping |
| Valhalla | ● Moderate | Via Stadia Maps | ✓ Docker | Good (OSM data) | Hard | Complex fleet ops |

Geocoding Services

Convert "Vijay Nagar, Indore" into coordinates, and coordinates back to an address

Nominatim

OSM · Free · Open

100% OSS Free ★ Rec

The official geocoder for OpenStreetMap data. Used by most OSM-based apps. The public API is free but rate-limited to 1 request/second. For production, self-host it with an India OSM extract — unlimited and private.

Public API1 req/second max on nominatim.openstreetmap.org

Self-hostYes — Docker, needs \~64GB disk for India extract

AccuracyGood for city-level; Indian addresses can be inconsistent

CostZero — completely open source

LicenseGPL-2.0

Photon

OSM · Fast search

OSS Free

Built on Elasticsearch + OSM data. Much faster than Nominatim for autocomplete search (restaurant name search, address lookup as you type). Great for the customer address input field in your app.

Public APIphoton.komoot.io — limited, no production use

Self-hostYes — Docker with Elasticsearch; \~20GB for India

Best forAutocomplete / typeahead address search

LicenseApache 2.0

Ola Maps Geocoding

India-first · API

🇮🇳 India 5M free/month

Forward + reverse geocoding tuned for Indian addresses — handles Hindi text, non-standard addresses, and local landmarks better than global geocoders. "Near Rajwada, Indore" just works.

Indian addressesExcellent — landmark-based, mixed-language

AutocompleteYes — Places Autocomplete API included

Free tierPart of 5M calls/month bundle

ControlVendor dependency

Pelias

OSM · Self-hosted

OSS Free

Modern modular geocoder using multiple data sources (OSM, OpenAddresses, Who's on First). Used by Mapzen. More complex to set up but very powerful for custom address data integration.

SetupComplex — multiple services, Elasticsearch

Data sourcesOSM + multiple — better coverage

LicenseMIT

Best forLarger teams with DevOps capacity

India-Specific Options

Services with Indian road data, Hindi support, and local landmark awareness — critical for Indore delivery

Ola Maps (Krutrim)

Full platform · India-first

🇮🇳 5M free/month ★ Top India Pick

Launched July 2024, Ola's developer mapping platform is built on data from Ola's own ride-hailing network across Indian cities. For Indore food delivery, this means better one-way road awareness, local traffic patterns, and address data. The 5 million free API calls cover tiles + routing + geocoding + autocomplete.

Free tier5,000,000 API calls/month across all services

ONDC deal3 years FREE for ONDC platform startups

Web SDKJavaScript SDK, works with Leaflet/MapLibre

APIsMaps, Directions, Distance Matrix, Places, Geocoding

Data residencyIndia servers — DPDP compliant

Paid50% of Google Maps India rates after free tier

MapMyIndia / Mappls

India's oldest map platform

🇮🇳 Free tier

30 years of Indian mapping data, ISRO partnership, and 95% of India's in-dash car navigation market. Their data is the most detailed for India — including small lanes, pin code mapping, and eLoc (India-specific place codes).

Free tierLimited — contact sales for exact quota

India dataBest-in-class — 30 years of ground surveys

eLocIndia-specific 6-char place codes (like w3w)

APIsMaps, Routing, Geocoding, Traffic, Places

PricingContact-based — not fully transparent

OpenStreetMap India

Community data · Improving

OSS Free forever

India's OSM community has been very active. Major cities like Indore are well-mapped for roads and POIs. The Humanitarian OpenStreetMap Team (HOT) has contributed significantly to smaller towns too.

Indore coverageExcellent for roads; good for POIs

UpdatesContinuous — community edits daily

CostFree — only hosting/server costs

ControlYou can fix errors yourself!

Recommended Stacks for Indore Food Delivery

Two paths: quick-start managed, or fully self-hosted. Both are free.

Path A: Quick Start

Managed · Zero DevOps

5M free/month

Use Ola Maps for everything. One API key, one SDK, zero servers to manage. Best for getting to production fastest. Scales to \~100 delivery orders/day comfortably within free tier.

Map renderLeaflet.js + Ola Maps tile SDK

RoutingOla Maps Directions API

GeocodingOla Maps Places + Geocoding API

Live trackingWebSocket (your backend) + Leaflet marker

Cost₹0 up to 5M calls/month

Setup time1-2 days

Path B: Self-Hosted

Full OSS · Unlimited

100% OSS

Full control, no vendor lock-in, unlimited requests. Needs a small server (\~$10-15/month on DigitalOcean or free on a home server). Powers Uber, Swiggy, Zomato at their core.

Map renderLeaflet.js (free, forever)

Map tilesStadia Maps free tier OR self-hosted PMTiles

RoutingOSRM (Docker, India OSM extract)

GeocodingNominatim (Docker) or Photon for autocomplete

Live trackingWebSocket + Leaflet.Realtime plugin

Cost₹0 (self-host) or \~$10/mo server

Setup time3-7 days

Integration code — Leaflet + Ola Maps

HTML — basic setup (Path A)

\<!-- 1. Load Leaflet --> \<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"> \<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js">\</script> \<div id="map" style="height:500px">\</div> \<script> // 2. Initialize map centered on Indore const map = L.map('map').setView(\[22.7196, 75.8577\], 13); // 3. Add Ola Maps tiles (replace YOUR_API_KEY) L.tileLayer('https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/static/{z}/{x}/{y}.png?api_key=YOUR_API_KEY', { attribution: '© Ola Maps © OpenStreetMap contributors', maxZoom: 18 }).addTo(map); // 4. Add a live delivery agent marker const agentMarker = L.circleMarker(\[22.7196, 75.8577\], { radius: 10, fillColor: '#2dd4bf', color: '#fff', weight: 2, fillOpacity: 1 }).addTo(map); // 5. Update position via WebSocket from your backend const ws = new WebSocket('wss://your-backend.com/track/order-123'); ws.onmessage = (e) => { const {lat, lng} = JSON.parse(e.data); agentMarker.setLatLng(\[lat, lng\]); // moves the dot on the map }; \</script>

Get a route — Ola Maps Directions API

// Calculate route: restaurant → customer async function getRoute(fromLat, fromLng, toLat, toLng) { const url = \`https://api.olamaps.io/routing/v1/directions?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&api_key=YOUR_KEY\`; const res = await fetch(url); const data = await res.json(); // Draw the route on the map const coords = data.routes\[0\].legs\[0\].steps .flatMap(s => s.geometry.coordinates) .map((\[lng, lat\]) => \[lat, lng\]); L.polyline(coords, { color: '#2dd4bf', weight: 4 }).addTo(map); map.fitBounds(L.polyline(coords).getBounds()); }

*🔑* Get your free Ola Maps API key at **maps.olakrutrim.com** → Developer Console. No credit card required. If you're building on ONDC, register there for 3 years free access.