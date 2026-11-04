'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';

export interface LiveDeliveryMapProps {
  driverLocation?: { latitude: number; longitude: number; heading?: number } | null;
  customerLocation: { latitude: number; longitude: number; address?: string; name?: string };
  kitchenLocation?: { latitude: number; longitude: number; name?: string };
  orderNumber?: string;
  status?: string;
  riderName?: string;
  riderVehicle?: string;
  height?: string;
  isRiderView?: boolean;
  onLocationUpdate?: (location: { latitude: number; longitude: number; heading?: number }) => void;
}

export default function LiveDeliveryMap({
  driverLocation,
  customerLocation,
  kitchenLocation = { latitude: 22.6288, longitude: 75.5684, name: 'Janki Rasoi Kitchen' },
  orderNumber,
  status = 'OUT_FOR_DELIVERY',
  riderName = 'Delivery Partner',
  riderVehicle = 'MP-09-JR-2026',
  height = '360px',
  isRiderView = false,
  onLocationUpdate,
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const kitchenMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Active current driver location (interpolated smoothly)
  const [currentDriverPos, setCurrentDriverPos] = useState<{ lat: number; lng: number; heading: number }>({
    lat: driverLocation?.latitude || kitchenLocation.latitude,
    lng: driverLocation?.longitude || kitchenLocation.longitude,
    heading: driverLocation?.heading || 0,
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = useRef<any>(null);

  // Calculate distance in km
  const getDistanceKm = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }, []);

  const distanceKm = getDistanceKm(
    currentDriverPos.lat,
    currentDriverPos.lng,
    customerLocation.latitude,
    customerLocation.longitude
  );

  const etaMinutes = Math.max(2, Math.round(distanceKm * 3.5));

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import Leaflet to prevent SSR window errors
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Clean existing instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initial center between driver and customer
      const midLat = (currentDriverPos.lat + customerLocation.latitude) / 2;
      const midLng = (currentDriverPos.lng + customerLocation.longitude) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [midLat, midLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // Clean OpenStreetMap standard tiles (100% free, zero watermark, full local road accuracy)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // 1. Kitchen Custom Pin (Storefront)
      const kitchenIcon = L.divIcon({
        className: 'custom-kitchen-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="background-color: #1b4d2e; color: white; border: 2px solid white; border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
              <span class="material-symbols-outlined" style="font-size: 20px;">restaurant</span>
            </div>
            <div style="background: white; border: 1px solid #d1d5db; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; color: #1b4d2e; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 2px; white-space: nowrap;">
              Kitchen
            </div>
          </div>
        `,
        iconSize: [34, 52],
        iconAnchor: [17, 34],
      });

      kitchenMarkerRef.current = L.marker([kitchenLocation.latitude, kitchenLocation.longitude], {
        icon: kitchenIcon,
      })
        .addTo(map)
        .bindPopup(`<strong>${kitchenLocation.name || 'Janki Rasoi Kitchen'}</strong><br/>Pickup Hub, Sagore`);

      // 2. Customer Destination Pin
      const customerIcon = L.divIcon({
        className: 'custom-customer-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="background-color: #d97706; color: white; border: 2px solid white; border-radius: 9999px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(217, 119, 6, 0.4);">
              <span class="material-symbols-outlined" style="font-size: 20px;">home_pin</span>
            </div>
            <div style="background: white; border: 1px solid #d1d5db; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; color: #92400e; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-top: 2px; white-space: nowrap;">
              Drop-off
            </div>
          </div>
        `,
        iconSize: [34, 52],
        iconAnchor: [17, 34],
      });

      customerMarkerRef.current = L.marker([customerLocation.latitude, customerLocation.longitude], {
        icon: customerIcon,
      })
        .addTo(map)
        .bindPopup(`<strong>Drop-off: ${customerLocation.name || 'Customer'}</strong><br/>${customerLocation.address || 'Sagore, Pithampur'}`);

      // 3. Driver Live Marker (Swiggy/Zomato Motorcycle with animated radar pulse)
      const driverIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <!-- Radar Ripple Ring -->
            <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(56, 117, 74, 0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <!-- Marker Body -->
            <div style="position: relative; background: #38754A; color: white; border: 2.5px solid white; border-radius: 9999px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(56, 117, 74, 0.45); transform: rotate(${currentDriverPos.heading}deg); transition: transform 0.4s ease;">
              <span class="material-symbols-outlined" style="font-size: 22px;">two_wheeler</span>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      driverMarkerRef.current = L.marker([currentDriverPos.lat, currentDriverPos.lng], {
        icon: driverIcon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(`<strong>${riderName}</strong><br/>${riderVehicle} • Out for Delivery`);

      // 4. Route Polyline connecting Kitchen -> Driver -> Destination
      const routePoints: [number, number][] = [
        [kitchenLocation.latitude, kitchenLocation.longitude],
        [currentDriverPos.lat, currentDriverPos.lng],
        [customerLocation.latitude, customerLocation.longitude],
      ];

      polylineRef.current = L.polyline(routePoints, {
        color: '#38754A',
        weight: 4.5,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Fit bounds with comfortable padding
      const group = L.featureGroup([
        driverMarkerRef.current,
        customerMarkerRef.current,
        kitchenMarkerRef.current,
      ]);
      map.fitBounds(group.getBounds().pad(0.2));
    });

    return () => {
      isMounted = false;
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Driver Marker smoothly when driverLocation prop changes
  useEffect(() => {
    if (!driverLocation || !mapInstanceRef.current || !driverMarkerRef.current) return;

    const targetLat = driverLocation.latitude;
    const targetLng = driverLocation.longitude;
    const heading = driverLocation.heading ?? 0;

    // Smooth position update
    setCurrentDriverPos({ lat: targetLat, lng: targetLng, heading });
    driverMarkerRef.current.setLatLng([targetLat, targetLng]);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs([
        [kitchenLocation.latitude, kitchenLocation.longitude],
        [targetLat, targetLng],
        [customerLocation.latitude, customerLocation.longitude],
      ]);
    }
  }, [driverLocation, customerLocation, kitchenLocation]);

  // Recenter on Driver
  const handleRecenterOnDriver = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.panTo([currentDriverPos.lat, currentDriverPos.lng], {
      animate: true,
      duration: 0.8,
    });
  };

  // Fit Entire Route
  const handleFitRoute = () => {
    if (!mapInstanceRef.current || typeof window === 'undefined') return;
    import('leaflet').then((L) => {
      if (!mapInstanceRef.current) return;
      const points: [number, number][] = [
        [kitchenLocation.latitude, kitchenLocation.longitude],
        [currentDriverPos.lat, currentDriverPos.lng],
        [customerLocation.latitude, customerLocation.longitude],
      ];
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds.pad(0.25));
    });
  };

  // Simulation mode: Smoothly moves rider along route to customer (Swiggy/Zomato test experience)
  const toggleSimulation = () => {
    if (isSimulating) {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      setIsSimulating(false);
      return;
    }

    setIsSimulating(true);

    let step = 0;
    const totalSteps = 40;
    const startLat = kitchenLocation.latitude;
    const startLng = kitchenLocation.longitude;
    const endLat = customerLocation.latitude;
    const endLng = customerLocation.longitude;

    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);

    simulationIntervalRef.current = setInterval(() => {
      step = (step + 1) % (totalSteps + 1);
      const ratio = step / totalSteps;
      const nextLat = startLat + (endLat - startLat) * ratio;
      const nextLng = startLng + (endLng - startLng) * ratio;

      // Calculate bearing angle
      const dLon = endLng - startLng;
      const y = Math.sin(dLon) * Math.cos(endLat);
      const x =
        Math.cos(startLat) * Math.sin(endLat) -
        Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLon);
      const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

      setCurrentDriverPos({ lat: nextLat, lng: nextLng, heading: bearing });

      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([nextLat, nextLng]);
      }

      if (polylineRef.current) {
        polylineRef.current.setLatLngs([
          [kitchenLocation.latitude, kitchenLocation.longitude],
          [nextLat, nextLng],
          [endLat, endLng],
        ]);
      }

      if (onLocationUpdate) {
        onLocationUpdate({ latitude: nextLat, longitude: nextLng, heading: bearing });
      }
    }, 1200);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#EEE7DC] bg-[#FFF9F0] shadow-sm">
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="w-full relative z-0"
      />

      {/* Floating Status & ETA Card (Swiggy/Zomato style) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-[#292D26] leading-none">
              {status === 'DELIVERED'
                ? 'Delivered to Customer'
                : `Driver ~${distanceKm} km away`}
            </span>
            <span className="text-[10px] text-[#77786F] font-semibold">
              {status === 'DELIVERED' ? 'Order Complete' : `ETA ~${etaMinutes} mins • On the way`}
            </span>
          </div>
        </div>

        {orderNumber && (
          <span className="self-start px-2 py-0.5 rounded-md bg-[#EAF4ED] text-[#38754A] font-bold text-[10px] border border-[#38754A]/20 shadow-2xs">
            Order #{orderNumber}
          </span>
        )}
      </div>

      {/* Floating Action Controls on Map */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleRecenterOnDriver}
          title="Center on Driver"
          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#292D26] text-[11px] font-bold border border-slate-200 shadow-md flex items-center gap-1 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[15px] text-[#38754A]">my_location</span>
          <span>Driver</span>
        </button>

        <button
          type="button"
          onClick={handleFitRoute}
          title="Fit Route"
          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#292D26] text-[11px] font-bold border border-slate-200 shadow-md flex items-center gap-1 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[15px] text-amber-700">route</span>
          <span>Full Route</span>
        </button>

        {/* Simulation Demo Toggle (Swiggy/Zomato real-time motion preview) */}
        <button
          type="button"
          onClick={toggleSimulation}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shadow-md flex items-center gap-1 active:scale-95 transition-all ${
            isSimulating
              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
              : 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">
            {isSimulating ? 'stop_circle' : 'play_circle'}
          </span>
          <span>{isSimulating ? 'Stop Sim' : 'Simulate Motion'}</span>
        </button>
      </div>

      {/* External Google Maps Navigation link for real rider on the road */}
      {isRiderView && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${customerLocation.latitude},${customerLocation.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-[#38754A] hover:bg-[#285C38] text-white text-[11px] font-bold shadow-md flex items-center gap-1 pointer-events-auto transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">navigation</span>
          <span>Turn-by-Turn</span>
        </a>
      )}
    </div>
  );
}
