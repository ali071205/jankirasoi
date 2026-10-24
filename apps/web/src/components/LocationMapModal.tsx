'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface LocationData {
  addressType: 'Home' | 'Work' | 'Other';
  flat: string;
  street: string;
  landmark: string;
  pincode: string;
  city: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: LocationData) => void;
  initialPincode?: string;
  initialFlat?: string;
  initialStreet?: string;
  initialLandmark?: string;
}

const SAGORE_PRESETS = [
  {
    name: 'Sagore Main Market',
    area: 'Main Bazar, Sagore, Pithampur',
    landmark: 'Near Sagore Post Office',
    pincode: '454774',
    lat: 22.6288,
    lng: 75.5684,
  },
  {
    name: 'Sagore Kuti & Bus Stand',
    area: 'Dhar-Indore Road, Sagore',
    landmark: 'Near Sagore Bus Stand',
    pincode: '454774',
    lat: 22.6312,
    lng: 75.5715,
  },
  {
    name: 'Pithampur Sector 1',
    area: 'Sector 1 Industrial Area, Pithampur',
    landmark: 'Near Cipla / Eicher Square',
    pincode: '454774',
    lat: 22.6085,
    lng: 75.5921,
  },
  {
    name: 'Pithampur Sector 3',
    area: 'Sector 3 Smart Industrial Zone, Pithampur',
    landmark: 'Near NATRAX Hub',
    pincode: '454774',
    lat: 22.5891,
    lng: 75.5412,
  },
  {
    name: 'Chatrachhaya Colony',
    area: 'Chatrachhaya Colony, Sagore',
    landmark: 'Near Hanuman Temple',
    pincode: '454774',
    lat: 22.6254,
    lng: 75.5642,
  },
];

export default function LocationMapModal({
  isOpen,
  onClose,
  onConfirm,
  initialPincode = '454774',
  initialFlat = '',
  initialStreet = '',
  initialLandmark = '',
}: LocationMapModalProps) {
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [lat, setLat] = useState(22.6288);
  const [lng, setLng] = useState(75.5684);
  const [zoom, setZoom] = useState(15);
  const [flat, setFlat] = useState(initialFlat || 'Shop 12 / House 44');
  const [street, setStreet] = useState(initialStreet || 'Main Market Road, Sagore');
  const [landmark, setLandmark] = useState(initialLandmark || 'Near Sagore Police Station');
  const [pincode, setPincode] = useState(initialPincode || '454774');
  const [city, setCity] = useState('Sagore, Pithampur');
  const [displayAddress, setDisplayAddress] = useState('Sagore Main Market, Pithampur, MP 454774');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Update when opened
  useEffect(() => {
    if (isOpen) {
      if (initialFlat) setFlat(initialFlat);
      if (initialStreet) setStreet(initialStreet);
      if (initialLandmark) setLandmark(initialLandmark);
      if (initialPincode) setPincode(initialPincode);
    }
  }, [isOpen, initialFlat, initialStreet, initialLandmark, initialPincode]);

  if (!isOpen) return null;

  // Search places using Nominatim OpenStreetMap
  const handleSearch = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText || queryText.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const q = encodeURIComponent(`${queryText}, Madhya Pradesh`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`, {
        headers: { 'Accept-Language': 'en' },
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
      }
    } catch {
      // Fallback to local filter
      const local = SAGORE_PRESETS.filter(
        (p) =>
          p.name.toLowerCase().includes(queryText.toLowerCase()) ||
          p.area.toLowerCase().includes(queryText.toLowerCase())
      );
      setSearchResults(
        local.map((p) => ({
          display_name: `${p.name}, ${p.area}, ${p.pincode}`,
          lat: p.lat.toString(),
          lon: p.lng.toString(),
        }))
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Select place from search or preset
  const selectLocation = (newLat: number, newLng: number, name: string, pin = '454774') => {
    setLat(newLat);
    setLng(newLng);
    setZoom(16);
    setDisplayAddress(name);
    setStreet(name.split(',')[0] || name);
    setPincode(pin);
    setCity('Sagore, Pithampur');
    setSearchResults([]);
  };

  // Use GPS / Current Location
  const handleUseCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLat(userLat);
        setLng(userLng);
        setZoom(16);

        // Reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const pin = addr.postcode || '454774';
            const detectedArea = addr.suburb || addr.neighbourhood || addr.road || 'Sagore Area';
            const detectedCity = addr.city || addr.town || addr.village || 'Sagore, Pithampur';
            
            setDisplayAddress(data.display_name || 'Current GPS Location');
            setStreet(detectedArea);
            setPincode(pin === '454774' ? '454774' : pin);
            setCity(detectedCity);
          }
        } catch {
          setDisplayAddress('Current GPS Location, Sagore');
          setStreet('Near Current Location, Sagore');
          setPincode('454774');
        } finally {
          setIsGpsLoading(false);
        }
      },
      (err) => {
        setIsGpsLoading(false);
        console.warn('GPS location error:', err.message);
        // Default to Sagore center
        selectLocation(22.6288, 75.5684, 'Sagore Main Market, Pithampur', '454774');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Confirm and save location
  const handleConfirmLocation = () => {
    onConfirm({
      addressType,
      flat: flat.trim() || 'House / Flat Details',
      street: street.trim() || 'Sagore Main Road',
      landmark: landmark.trim(),
      pincode: pincode.trim() || '454774',
      city,
      formattedAddress: `${flat ? flat + ', ' : ''}${street}, ${landmark ? landmark + ', ' : ''}${city} - ${pincode}`,
      lat,
      lng,
    });
    onClose();
  };

  // Generate OpenStreetMap embed tile URL
  const bboxPadding = 0.005;
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - bboxPadding}%2C${lat - bboxPadding}%2C${lng + bboxPadding}%2C${lat + bboxPadding}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-[22px]">explore</span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Choose Delivery Location</h3>
              <p className="text-[10px] text-slate-500">Pick on map or search your address in Sagore</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          
          {/* Search Bar & GPS Button */}
          <div className="p-3 bg-white border-b border-slate-100 flex flex-col gap-2">
            <div className="relative">
              <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search area, landmark or street in Sagore..."
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                </button>
              )}
            </div>

            {/* GPS Locate Me Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isGpsLoading}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 active:scale-95 transition-transform"
              >
                <span className={`material-symbols-outlined text-[18px] text-emerald-600 ${isGpsLoading ? 'animate-spin' : ''}`}>
                  {isGpsLoading ? 'sync' : 'my_location'}
                </span>
                <span>{isGpsLoading ? 'Locating your GPS...' : 'Use Current Location (GPS)'}</span>
              </button>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Pincode: 454774
              </span>
            </div>

            {/* Live Search Autocomplete Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-xl bg-white shadow-lg overflow-hidden flex flex-col divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      selectLocation(
                        parseFloat(item.lat),
                        parseFloat(item.lon),
                        item.display_name,
                        item.display_name.includes('454774') ? '454774' : '454774'
                      )
                    }
                    className="p-2.5 text-left hover:bg-emerald-50/60 transition-colors flex items-start gap-2 text-xs"
                  >
                    <span className="material-symbols-outlined text-emerald-700 text-[16px] shrink-0 mt-0.5">
                      location_on
                    </span>
                    <span className="text-slate-700 line-clamp-2 leading-tight">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Map Preview with Pinpoint */}
          <div className="relative w-full h-52 sm:h-60 bg-slate-100 overflow-hidden border-b border-slate-200">
            <iframe
              title="Sagore Delivery Map"
              src={mapEmbedUrl}
              className="w-full h-full border-0 pointer-events-auto"
              loading="lazy"
              onLoad={() => setMapLoaded(true)}
            />

            {/* Central Pin Floating Marker */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center -translate-y-4">
              <div className="relative flex flex-col items-center animate-bounce">
                <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold shadow-md whitespace-nowrap mb-1">
                  Deliver to this point
                </span>
                <span
                  className="material-symbols-outlined text-rose-600 text-[36px] drop-shadow-md"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  location_on
                </span>
              </div>
              <div className="w-3 h-1.5 bg-black/30 rounded-full blur-[1px]"></div>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 1, 18))}
                className="w-8 h-8 rounded-lg bg-white/95 text-slate-800 shadow-md flex items-center justify-center font-bold text-base hover:bg-white active:scale-95"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 1, 12))}
                className="w-8 h-8 rounded-lg bg-white/95 text-slate-800 shadow-md flex items-center justify-center font-bold text-base hover:bg-white active:scale-95"
              >
                -
              </button>
            </div>
          </div>

          {/* Quick Presets for Sagore Localities */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Popular Localities in Sagore (454774):
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {SAGORE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => selectLocation(p.lat, p.lng, `${p.name}, ${p.area}`, p.pincode)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-[11px] font-semibold text-slate-700 whitespace-nowrap border border-slate-200 hover:border-emerald-500 shadow-2xs transition-all shrink-0 flex items-center gap-1"
                >
                  <span className="text-[10px] text-emerald-700">📍</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Address Details Form */}
          <div className="p-4 flex flex-col gap-3">
            
            {/* Selected Location Pill */}
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-emerald-700 text-[20px] shrink-0 mt-0.5">
                verified
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950">Active Delivery Zone</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                    FREE DELIVERY
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium truncate mt-0.5">{displayAddress}</p>
                <p className="text-[11px] text-emerald-800 font-bold mt-0.5">Sagore, Pithampur • PIN {pincode}</p>
              </div>
            </div>

            {/* Address Tag Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Save as:</span>
              {(['Home', 'Work', 'Other'] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setAddressType(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    addressType === tag
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-2.5 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  House / Flat / Floor / Shop No. *
                </label>
                <input
                  type="text"
                  required
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                  placeholder="e.g. Shop 12 / Flat 304, Block B"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 font-medium text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Street / Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. Main Market, Sagore"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Police Station"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={city}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="454774"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 font-bold text-emerald-800"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLocation}
            className="flex-1 py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-transform"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Confirm Location &amp; Deliver Here</span>
          </button>
        </div>

      </div>
    </div>
  );
}
