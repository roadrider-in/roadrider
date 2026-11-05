// Deno Edge Function for secure Google Maps Platform proxying
// Handles: autocomplete (Places API New), place-details, compute-routes (Routes API), reverse-geocode

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-goog-api-key, x-session-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_MAPS_API_KEY secret is not configured on Supabase" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // 1. PLACES AUTOCOMPLETE (New Places API)
    if (action === "autocomplete") {
      const input = url.searchParams.get("input") || "";
      const lat = parseFloat(url.searchParams.get("lat") || "26.8467");
      const lng = parseFloat(url.searchParams.get("lng") || "80.9462");
      const sessionToken = url.searchParams.get("sessionToken");

      if (!input.trim()) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bodyPayload: any = {
        input,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 50000.0,
          },
        },
      };
      if (sessionToken) {
        bodyPayload.sessionToken = sessionToken;
      }

      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. PLACE DETAILS (New Places API)
    if (action === "place-details") {
      const placeId = url.searchParams.get("placeId");
      const sessionToken = url.searchParams.get("sessionToken");

      if (!placeId) {
        return new Response(JSON.stringify({ error: "placeId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let detailUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
      if (sessionToken) {
        detailUrl += `?sessionToken=${encodeURIComponent(sessionToken)}`;
      }

      const res = await fetch(detailUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location,shortFormattedAddress,addressComponents",
        },
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. COMPUTE ROUTES (Routes API)
    if (action === "compute-routes") {
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        body = {};
      }

      const origin = body.origin;
      const destination = body.destination;
      const travelMode = body.travelMode || "DRIVE";

      if (!origin || !destination) {
        return new Response(JSON.stringify({ error: "origin and destination latLng are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode,
          routingPreference: "TRAFFIC_AWARE",
        }),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. REVERSE GEOCODE (Geocoding API)
    if (action === "reverse-geocode") {
      const lat = url.searchParams.get("lat");
      const lng = url.searchParams.get("lng");

      if (!lat || !lng) {
        return new Response(JSON.stringify({ error: "lat and lng query params are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
