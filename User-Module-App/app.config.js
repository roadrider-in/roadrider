const fs = require("fs");
const path = require("path");

// Ensure .env is loaded if running in build environments that don't pre-populate process.env
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
    plugins: [
      ...(config.plugins || []),
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "RoadRider requires your location to provide accurate courier pickup and delivery tracking.",
          locationWhenInUsePermission:
            "RoadRider requires your location to display nearby couriers and road routes.",
        },
      ],
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
          iosGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
  };
};
