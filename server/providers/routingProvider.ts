import { LocationInfo, RouteCheckpoint } from "../types.js";
import { appCache } from "../cache.js";

export interface RouteResult {
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  checkpoints: RouteCheckpoint[];
  geometryCoordinates: [number, number][]; // [lon, lat]
  provider: string;
}

export interface IRoutingProvider {
  getRoute(origin: LocationInfo, destination: LocationInfo, mode?: string): Promise<RouteResult>;
}

export class OsrmRoutingProvider implements IRoutingProvider {
  private baseUrl = "https://router.project-osrm.org/route/v1/driving";

  async getRoute(origin: LocationInfo, destination: LocationInfo, mode: string = "car"): Promise<RouteResult> {
    const cacheKey = `route_${origin.latitude.toFixed(2)}_${origin.longitude.toFixed(2)}_to_${destination.latitude.toFixed(2)}_${destination.longitude.toFixed(2)}_${mode}`;
    const cached = appCache.get<RouteResult>(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const url = `${this.baseUrl}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`OSRM routing status ${res.status}`);
      }

      const data = await res.json();
      const route = data.routes?.[0];

      if (!route) {
        throw new Error("No route found between specified points");
      }

      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      let durationMinutes = Math.round(route.duration / 60);

      // Adjust estimated duration based on travel mode
      if (mode === "bike") durationMinutes = Math.round(durationMinutes * 1.2);
      else if (mode === "bus") durationMinutes = Math.round(durationMinutes * 1.35);
      else if (mode === "train") durationMinutes = Math.round(durationMinutes * 0.95);
      else if (mode === "flight") durationMinutes = Math.max(60, Math.round(distanceKm / 12)); // Air estimate

      const coordinates: [number, number][] = route.geometry?.coordinates || [];

      // Sample 5 checkpoints: 0%, 25%, 50%, 75%, 100%
      const fractions = [0, 0.25, 0.5, 0.75, 1.0];
      const checkpoints: RouteCheckpoint[] = [];

      for (let i = 0; i < fractions.length; i++) {
        const frac = fractions[i];
        let lat = origin.latitude;
        let lon = origin.longitude;
        let checkpointName = "";

        if (frac === 0) {
          lat = origin.latitude;
          lon = origin.longitude;
          checkpointName = `${origin.name} (Start)`;
        } else if (frac === 1.0) {
          lat = destination.latitude;
          lon = destination.longitude;
          checkpointName = `${destination.name} (Arrival)`;
        } else {
          if (coordinates.length > 0) {
            const coordIndex = Math.min(coordinates.length - 1, Math.floor(frac * (coordinates.length - 1)));
            lon = coordinates[coordIndex][0];
            lat = coordinates[coordIndex][1];
          } else {
            // Linear interpolate if coordinates missing
            lat = origin.latitude + frac * (destination.latitude - origin.latitude);
            lon = origin.longitude + frac * (destination.longitude - origin.longitude);
          }
          checkpointName = `Waypoint ${i} (${Math.round(frac * 100)}% route)`;
        }

        const checkpointDistance = Math.round(distanceKm * frac);
        const timeOffset = Math.round(durationMinutes * frac);
        const arrivalDate = new Date(Date.now() + timeOffset * 60 * 1000);
        const estimatedArrival = arrivalDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

        checkpoints.push({
          name: checkpointName,
          latitude: Math.round(lat * 10000) / 10000,
          longitude: Math.round(lon * 10000) / 10000,
          distanceKm: checkpointDistance,
          timeOffsetMinutes: timeOffset,
          estimatedArrival,
        });
      }

      const result: RouteResult = {
        totalDistanceKm: distanceKm,
        estimatedDurationMinutes: durationMinutes,
        checkpoints,
        geometryCoordinates: coordinates,
        provider: "Open Source Routing Machine (OSRM)",
      };

      appCache.set(cacheKey, result, 3600); // 1 hour
      return result;
    } catch (err: any) {
      clearTimeout(timeout);
      // Fallback to geometric Great Circle interpolation
      return this.fallbackGeodesicRoute(origin, destination, mode);
    }
  }

  private fallbackGeodesicRoute(origin: LocationInfo, destination: LocationInfo, mode: string): RouteResult {
    // Haversine distance
    const R = 6371; // Earth radius in km
    const dLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
    const dLon = ((destination.longitude - origin.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.latitude * Math.PI) / 180) *
        Math.cos((destination.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const directDistance = R * c;
    const roadDistance = Math.round(directDistance * 1.25); // Road winding multiplier
    const speedKmh = mode === "bike" ? 45 : mode === "bus" ? 50 : mode === "train" ? 75 : mode === "flight" ? 600 : 65;
    const durationMinutes = Math.round((roadDistance / speedKmh) * 60);

    const fractions = [0, 0.25, 0.5, 0.75, 1.0];
    const checkpoints: RouteCheckpoint[] = fractions.map((frac, i) => {
      const lat = origin.latitude + frac * (destination.latitude - origin.latitude);
      const lon = origin.longitude + frac * (destination.longitude - origin.longitude);
      const dist = Math.round(roadDistance * frac);
      const timeOffset = Math.round(durationMinutes * frac);
      const arrival = new Date(Date.now() + timeOffset * 60000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

      return {
        name: i === 0 ? `${origin.name} (Start)` : i === 4 ? `${destination.name} (Arrival)` : `Midpoint ${i} (${Math.round(frac * 100)}%)`,
        latitude: Math.round(lat * 10000) / 10000,
        longitude: Math.round(lon * 10000) / 10000,
        distanceKm: dist,
        timeOffsetMinutes: timeOffset,
        estimatedArrival: arrival,
      };
    });

    return {
      totalDistanceKm: roadDistance,
      estimatedDurationMinutes: durationMinutes,
      checkpoints,
      geometryCoordinates: [
        [origin.longitude, origin.latitude],
        [destination.longitude, destination.latitude],
      ],
      provider: "Geodesic Approximation (Fallback)",
    };
  }
}

export const routingProvider: IRoutingProvider = new OsrmRoutingProvider();
