import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  ImageStyle,
} from "react-native";
import Icon from "../components/Icon";

const SUPABASE_STORAGE_URL = `${
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://sjahblquggmzlihqgzyt.supabase.co"
}/storage/v1/object/public`;

/**
 * Resolves a vendor-uploaded product image path to a full accessible Supabase Storage URL.
 * Returns null if no authentic photo was uploaded by the vendor.
 */
export function resolveVendorFoodImage(
  uploadedPhoto?: string | null
): string | null {
  if (!uploadedPhoto || typeof uploadedPhoto !== "string") return null;
  const trimmed = uploadedPhoto.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;

  // Direct web URL already uploaded
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Relative Supabase Storage path: product-images/{store_id}/{filename}
  const clean = trimmed.replace(/^\/+/, "");
  if (clean.startsWith("product-images/")) {
    return `${SUPABASE_STORAGE_URL}/${clean}`;
  }
  return `${SUPABASE_STORAGE_URL}/product-images/${clean}`;
}

interface VendorDishImageProps {
  uri?: string | null;
  name?: string;
  isVeg?: boolean;
  style?: ImageStyle | ViewStyle;
  imageStyle?: ImageStyle;
}

/**
 * VendorDishImage Component
 *
 * Strict Compliance:
 * 1. Uses the vendor's actual uploaded image from Supabase Storage when available.
 * 2. Never uses random food images or AI-generated stock replacements.
 * 3. Never assigns the same fallback image to multiple dishes.
 * 4. If a vendor has NOT uploaded an image (or if URL fails to load),
 *    renders a clean, neutral RoadRider branded placeholder.
 */
export function VendorDishImage({
  uri,
  name,
  isVeg = true,
  style,
  imageStyle,
}: VendorDishImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resolvedUri = resolveVendorFoodImage(uri);
  const showImage = Boolean(resolvedUri && !hasError);

  if (showImage && resolvedUri) {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={{ uri: resolvedUri }}
          style={[styles.image, imageStyle]}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => setHasError(true)}
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#c84b31" />
          </View>
        )}
      </View>
    );
  }

  // Neutral RoadRider Branded Placeholder (honest, elegant, no fake food photos)
  return (
    <View style={[styles.container, styles.placeholderContainer, style]}>
      <View style={styles.placeholderIconWrap}>
        <Icon name="cutlery" size={24} color="#b0a8a0" />
      </View>
      <Text style={styles.placeholderBrand}>ROADRIDER</Text>
      <Text style={styles.placeholderLabel} numberOfLines={1}>
        Freshly Prepared
      </Text>
      <View
        style={[
          styles.vegDotSmall,
          { backgroundColor: isVeg ? "#1e8e3e" : "#d93025" },
        ]}
      />
    </View>
  );
}

/**
 * Returns authentic uploaded photo or null.
 * Kept for backward compatibility with string-based image props.
 */
export function getVerifiedDishPhoto(
  _dishName: string,
  uploadedPhoto?: string | null,
  _isVeg: boolean = true
): string {
  const resolved = resolveVendorFoodImage(uploadedPhoto);
  // Return resolved URL if vendor uploaded photo, otherwise empty string
  return resolved || "";
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#f7f5f2",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(247, 245, 242, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f2ed",
    borderWidth: 1,
    borderColor: "#e8e3db",
    padding: 8,
  },
  placeholderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(200, 75, 49, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  placeholderBrand: {
    fontSize: 9,
    fontWeight: "800",
    color: "#a35e47",
    letterSpacing: 0.8,
  },
  placeholderLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#78716c",
    marginTop: 2,
  },
  vegDotSmall: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
