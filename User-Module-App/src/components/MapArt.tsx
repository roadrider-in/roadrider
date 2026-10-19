import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import GoogleMap, { type EtaResult } from "./GoogleMap";
import type { LatLng } from "../lib/googleMaps";

export interface MapArtProps {
  origin?: LatLng;
  destination?: LatLng;
  driver?: LatLng;
  etaText?: string;
  etaUnit?: string;
  style?: StyleProp<ViewStyle>;
  onEtaCalculated?: (eta: EtaResult) => void;
}

export default function MapArt({
  origin,
  destination,
  driver,
  etaText = "15 min",
  etaUnit = "away",
  style,
  onEtaCalculated,
}: MapArtProps) {
  return (
    <GoogleMap
      origin={origin}
      destination={destination}
      driver={driver}
      etaText={etaText}
      etaUnit={etaUnit}
      style={style}
      showRoute
      onEtaCalculated={onEtaCalculated}
    />
  );
}
