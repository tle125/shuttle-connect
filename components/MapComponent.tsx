import React, { useEffect, useRef } from 'react';
import { Station } from '../types';

interface MapProps {
  stations: Station[];
  center: [number, number];
  onStationSelect: (station: Station) => void;
  userLocation?: [number, number];
}

declare global {
  interface Window {
    L: any;
  }
}

const MapComponent: React.FC<MapProps> = ({ stations, center, onStationSelect, userLocation }) => {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapRef.current) {
      mapRef.current = window.L.map(mapContainerRef.current).setView(center, 10);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    } else {
        mapRef.current.setView(center);
    }

    // Clear existing layers (simplistic approach for React effect re-runs)
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker) {
        mapRef.current.removeLayer(layer);
      }
    });

    // Add Station Markers
    const blueIcon = new window.L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

    stations.forEach(station => {
      const marker = window.L.marker([station.lat, station.lng], { icon: blueIcon }).addTo(mapRef.current);
      marker.bindPopup(`<b>${station.name}</b><br>${station.description}`);
      marker.on('click', () => onStationSelect(station));
    });

    // Add User Marker
    if (userLocation) {
        const redIcon = new window.L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });
      const userMarker = window.L.marker(userLocation, { icon: redIcon }).addTo(mapRef.current);
      userMarker.bindPopup("You are here");
    }

    return () => {
      // Cleanup if needed, but keeping map instance alive usually better for SPA
    };
  }, [stations, center, userLocation, onStationSelect]);

  return <div ref={mapContainerRef} className="h-full w-full z-0" />;
};

export default MapComponent;
