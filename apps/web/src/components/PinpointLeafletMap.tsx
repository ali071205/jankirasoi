'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface PinpointLeafletMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  height?: string;
}

export default function PinpointLeafletMap({
  lat,
  lng,
  onPositionChange,
  height = '100%',
}: PinpointLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const isInternalMoveRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });
      mapRef.current = map;

      // Clean fast CartoDB Voyager raster tiles (0 API quota, works everywhere)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Listen for map drag/pan completion
      map.on('moveend', () => {
        const center = map.getCenter();
        isInternalMoveRef.current = true;
        onPositionChange(center.lat, center.lng);
        setTimeout(() => {
          isInternalMoveRef.current = false;
        }, 100);
      });
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync external lat/lng changes (e.g. from search selection or GPS button)
  useEffect(() => {
    if (!mapRef.current || isInternalMoveRef.current) return;
    const currentCenter = mapRef.current.getCenter();
    const distanceThreshold = 0.0001; // ~10m
    if (
      Math.abs(currentCenter.lat - lat) > distanceThreshold ||
      Math.abs(currentCenter.lng - lng) > distanceThreshold
    ) {
      mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
    }
  }, [lat, lng]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Center Fixed Pin Marker (Uber / Swiggy Style) */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center -translate-y-4">
        <div className="relative flex flex-col items-center">
          {/* Beacon Ripple */}
          <div className="absolute -bottom-1 w-4 h-2 bg-black/25 rounded-full blur-[1px] animate-pulse" />
          
          {/* Pin Icon */}
          <div className="relative w-9 h-9 rounded-full bg-[#E25822] border-2 border-white shadow-xl flex items-center justify-center text-white transition-transform duration-150">
            <span className="material-symbols-outlined text-[20px]">near_me</span>
          </div>
          
          {/* Pin Pointer Stem */}
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#E25822] -mt-[1px]" />
        </div>
      </div>
    </div>
  );
}
