import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Crosshair,
  ExternalLink,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCampusGeography, type CampusGeoPoint, type CampusGeoPointKind } from '@/data/campusGeography';
import type { CampusLocation } from '@/types/pilot';

const TILE_SIZE = 256;
const MIN_ZOOM = 14;
const MAX_ZOOM = 19;

export interface GeographicMapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind?: CampusGeoPointKind;
  detail?: string;
}

interface GeographicCampusMapProps {
  campus: CampusLocation;
  markers?: GeographicMapMarker[];
  title?: string;
  description?: string;
  compact?: boolean;
  showDirectory?: boolean;
  className?: string;
}

type Coordinate = { latitude: number; longitude: number };
type DeviceCoordinate = Coordinate & { accuracy: number };

function project({ latitude, longitude }: Coordinate, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function markerLabel(kind: CampusGeoPointKind) {
  if (kind === 'campus') return 'Campus';
  if (kind === 'library') return 'Library';
  if (kind === 'cafeteria') return 'Food';
  if (kind === 'meeting_point') return 'Meeting point';
  if (kind === 'incident') return 'Captured case';
  if (kind === 'device') return 'Your device';
  return 'Building';
}

function markerClasses(kind: CampusGeoPointKind) {
  if (kind === 'incident') return 'border-white bg-[#D7193F] text-white';
  if (kind === 'device') return 'border-white bg-[#22C55E] text-white';
  if (kind === 'campus') return 'border-white bg-[#002F6C] text-white';
  if (kind === 'meeting_point') return 'border-white bg-[#EA580C] text-white';
  if (kind === 'library') return 'border-white bg-[#7C3AED] text-white';
  if (kind === 'cafeteria') return 'border-white bg-[#0F766E] text-white';
  return 'border-white bg-[#475569] text-white';
}

export function GeographicCampusMap({
  campus,
  markers = [],
  title,
  description,
  compact = false,
  showDirectory = true,
  className = '',
}: GeographicCampusMapProps) {
  const geography = getCampusGeography(campus);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 900, height: compact ? 350 : 470 });
  const [zoom, setZoom] = useState(geography.defaultZoom);
  const [center, setCenter] = useState<Coordinate>({ latitude: geography.latitude, longitude: geography.longitude });
  const [selectedId, setSelectedId] = useState(geography.points[0]?.id ?? null);
  const [device, setDevice] = useState<DeviceCoordinate | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    setZoom(geography.defaultZoom);
    setCenter({ latitude: geography.latitude, longitude: geography.longitude });
    setSelectedId(geography.points[0]?.id ?? null);
    setDevice(null);
    setLocationError(null);
  }, [campus, geography.defaultZoom, geography.latitude, geography.longitude, geography.points]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const update = () => setSize({ width: Math.max(320, node.clientWidth), height: Math.max(300, node.clientHeight) });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const allPoints = useMemo(() => {
    const external = markers
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .map<CampusGeoPoint>((item) => ({
        id: `external-${item.id}`,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        kind: item.kind ?? 'incident',
        detail: item.detail,
        source: 'Captured device GPS',
      }));
    const devicePoint: CampusGeoPoint[] = device ? [{
      id: 'current-device-location',
      name: 'Your current device location',
      latitude: device.latitude,
      longitude: device.longitude,
      kind: 'device',
      detail: `Measured accuracy ±${Math.round(device.accuracy)} m`,
      source: 'Captured device GPS',
    }] : [];
    return [...geography.points, ...external, ...devicePoint];
  }, [device, geography.points, markers]);

  const selected = allPoints.find((item) => item.id === selectedId) ?? geography.points[0] ?? null;
  const centerPx = project(center, zoom);
  const topLeft = { x: centerPx.x - size.width / 2, y: centerPx.y - size.height / 2 };
  const tileCount = 2 ** zoom;

  const tiles = useMemo(() => {
    const result: Array<{ x: number; y: number; sourceX: number; left: number; top: number }> = [];
    const startX = Math.floor(topLeft.x / TILE_SIZE) - 1;
    const endX = Math.ceil((topLeft.x + size.width) / TILE_SIZE) + 1;
    const startY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
    const endY = Math.min(tileCount - 1, Math.ceil((topLeft.y + size.height) / TILE_SIZE) + 1);
    for (let x = startX; x <= endX; x += 1) {
      const sourceX = ((x % tileCount) + tileCount) % tileCount;
      for (let y = startY; y <= endY; y += 1) {
        result.push({ x, y, sourceX, left: x * TILE_SIZE - topLeft.x, top: y * TILE_SIZE - topLeft.y });
      }
    }
    return result;
  }, [size.height, size.width, tileCount, topLeft.x, topLeft.y]);

  const plottedPoints = useMemo(() => allPoints.map((item) => {
    const pixel = project(item, zoom);
    return { item, left: pixel.x - topLeft.x, top: pixel.y - topLeft.y };
  }), [allPoints, topLeft.x, topLeft.y, zoom]);

  const metersPerPixel = 156543.03392 * Math.cos((center.latitude * Math.PI) / 180) / 2 ** zoom;
  const devicePixel = device ? project(device, zoom) : null;
  const deviceAccuracyRadius = device && devicePixel
    ? Math.min(280, Math.max(8, device.accuracy / Math.max(0.01, metersPerPixel)))
    : 0;

  const resetCampus = () => {
    setCenter({ latitude: geography.latitude, longitude: geography.longitude });
    setZoom(geography.defaultZoom);
  };

  const focusPoint = (item: CampusGeoPoint) => {
    setSelectedId(item.id);
    setCenter({ latitude: item.latitude, longitude: item.longitude });
    setZoom((current) => Math.max(current, 18));
  };

  const locateDevice = () => {
    if (!navigator.geolocation) {
      setLocationError('This browser does not expose device geolocation.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setDevice(next);
        setCenter(next);
        setZoom(18);
        setSelectedId('current-device-location');
        setLocating(false);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Campus coordinates remain available.'
          : 'A reliable device location could not be captured. Try again outdoors.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 15_000 },
    );
  };

  return (
    <Card className={`overflow-hidden border-[#002F6C]/20 shadow-large ${className}`} data-testid="real-campus-geographic-map">
      <CardHeader className="border-b bg-gradient-to-r from-[#002F6C] via-[#07366D] to-[#10172A] text-white">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F2A900] text-[#002F6C] hover:bg-[#F2A900]"><Navigation className="mr-1 h-3.5 w-3.5" />Real campus map</Badge>
              <Badge variant="outline" className="border-white/30 text-white">{geography.points.length} verified point(s)</Badge>
            </div>
            <CardTitle className="mt-3 text-xl text-white sm:text-2xl">{title ?? `${geography.name} · Geographic Map`}</CardTitle>
            <CardDescription className="mt-2 max-w-3xl text-white/72">
              {description ?? geography.address}. Buildings and roads come from the live OpenStreetMap layer; CCSF pins are placed only where a published or captured coordinate exists.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={locateDevice} disabled={locating}>
              <LocateFixed className={`mr-2 h-4 w-4 ${locating ? 'animate-pulse' : ''}`} />{locating ? 'Locating…' : 'Locate me'}
            </Button>
            <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={resetCampus}>
              <RefreshCw className="mr-2 h-4 w-4" />Campus
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={viewportRef}
          className={`relative isolate overflow-hidden bg-slate-200 ${compact ? 'h-[350px]' : 'h-[430px] sm:h-[500px]'}`}
          aria-label={`Interactive geographic map of ${geography.name}`}
        >
          <div className="absolute inset-0 bg-slate-200" aria-hidden="true">
            {tiles.map((tile) => (
              <img
                key={`${zoom}-${tile.x}-${tile.y}`}
                src={`https://tile.openstreetmap.org/${zoom}/${tile.sourceX}/${tile.y}.png`}
                alt=""
                draggable={false}
                className="absolute h-64 w-64 max-w-none select-none"
                style={{ left: tile.left, top: tile.top }}
                loading="eager"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>

          {device && devicePixel && deviceAccuracyRadius > 0 && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500/70 bg-emerald-400/15"
              style={{
                left: devicePixel.x - topLeft.x,
                top: devicePixel.y - topLeft.y,
                width: deviceAccuracyRadius * 2,
                height: deviceAccuracyRadius * 2,
              }}
              aria-hidden="true"
            />
          )}

          {plottedPoints.map(({ item, left, top }) => {
            const visible = left >= -48 && left <= size.width + 48 && top >= -48 && top <= size.height + 48;
            if (!visible) return null;
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                className="group absolute z-20 -translate-x-1/2 -translate-y-full touch-manipulation focus-visible:outline-none"
                style={{ left, top }}
                onClick={() => setSelectedId(item.id)}
                aria-label={`Select ${item.name}`}
              >
                <span className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-xl transition group-hover:-translate-y-1 ${markerClasses(item.kind)} ${active ? 'ring-4 ring-[#F2A900]/70' : ''}`}>
                  {item.kind === 'device' ? <Crosshair className="h-4 w-4" /> : item.kind === 'incident' ? <ShieldCheck className="h-4 w-4" /> : item.kind === 'campus' ? <Building2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                </span>
                <span className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950/90 px-2 py-1 text-[10px] font-bold text-white shadow ${active ? 'block' : 'hidden group-hover:block'}`}>{item.name}</span>
              </button>
            );
          })}

          <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
            <Button size="icon" variant="secondary" className="h-9 w-9 shadow-lg" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 1))} disabled={zoom >= MAX_ZOOM} aria-label="Zoom map in"><ZoomIn className="h-4 w-4" /></Button>
            <Button size="icon" variant="secondary" className="h-9 w-9 shadow-lg" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 1))} disabled={zoom <= MIN_ZOOM} aria-label="Zoom map out"><ZoomOut className="h-4 w-4" /></Button>
          </div>

          <div className="absolute bottom-2 right-2 z-30 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
            © OpenStreetMap contributors
          </div>
        </div>

        <div className="border-t bg-background p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              {selected ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{selected.name}</h3>
                    <Badge variant="secondary">{markerLabel(selected.kind)}</Badge>
                    <Badge variant="outline">{selected.source}</Badge>
                  </div>
                  {selected.detail && <p className="mt-1 text-sm text-muted-foreground">{selected.detail}</p>}
                  <p className="mt-2 font-mono text-xs text-muted-foreground">{formatCoordinate(selected.latitude)}, {formatCoordinate(selected.longitude)}</p>
                </>
              ) : <p className="text-sm text-muted-foreground">Select a verified destination.</p>}
              <p className="mt-3 max-w-4xl text-xs leading-5 text-muted-foreground">{geography.sourceNote}</p>
              {locationError && <p className="mt-2 text-xs font-semibold text-destructive" role="alert">{locationError}</p>}
            </div>
            {selected && (
              <Button asChild variant="outline" size="sm">
                <a href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=19/${selected.latitude}/${selected.longitude}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />Open full map
                </a>
              </Button>
            )}
          </div>
        </div>

        {showDirectory && geography.points.length > 1 && (
          <div className="border-t bg-muted/25 p-4 sm:p-5">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Verified campus destinations</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {geography.points.map((item) => (
                <Button key={item.id} size="sm" variant={selectedId === item.id ? 'default' : 'outline'} className="shrink-0" onClick={() => focusPoint(item)}>
                  <MapPin className="mr-1.5 h-3.5 w-3.5" />{item.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
