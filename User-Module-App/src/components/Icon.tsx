import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  filled?: boolean;
}

/**
 * Native vector icon set for RoadRider.
 * Ported from original SVG path data (24x24 viewBox, strokeWidth 1.8).
 */
export default function Icon({
  name,
  size = 22,
  color = "#171514",
  filled = false,
}: IconProps) {
  const strokeColor = color;
  const fillColor = filled ? color : "none";

  const renderPaths = () => {
    switch (name) {
      case "bookmark":
        return (
          <Path
            d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "share":
        return (
          <>
            <Path
              d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );
      case "more-vertical":
        return (
          <>
            <Circle cx="12" cy="5" r="1.5" fill={strokeColor} />
            <Circle cx="12" cy="12" r="1.5" fill={strokeColor} />
            <Circle cx="12" cy="19" r="1.5" fill={strokeColor} />
          </>
        );
      case "chevron-up":
        return (
          <Path
            d="m18 15-6-6-6 6"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "chilli":
      case "flame":
        return (
          <Path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "leaf":
        return (
          <Path
            d="M11 20A7 7 0 0 1 4 13c0-4 3.5-7 7-9 3.5 2 7 5 7 9a7 7 0 0 1-7 7Zm0 0v-8"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "cutlery":
        return (
          <>
            <Path
              d="M18 2v20M6 2v7a3 3 0 0 0 3 3v10M3 2v4a3 3 0 0 0 3 3"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );
      case "target":
        return (
          <>
            <Circle
              cx="12"
              cy="12"
              r="7"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={fillColor}
            />
            <Circle
              cx="12"
              cy="12"
              r="2.5"
              fill={strokeColor}
            />
            <Path
              d="M12 2v3M12 19v3M2 12h3M19 12h3"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );
      case "history":
        return (
          <>
            <Path
              d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M3 3v5h5M12 7v5l3 3"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "bike":
        return (
          <>
            <Circle cx="5.5" cy="17.5" r="3.5" stroke={strokeColor} strokeWidth="1.8" fill="none" />
            <Circle cx="18.5" cy="17.5" r="3.5" stroke={strokeColor} strokeWidth="1.8" fill="none" />
            <Path
              d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 17.5V14l-3-3 4-3 2 3h3.5"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "auto":
        return (
          <>
            <Path
              d="M5 16h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H9L5 13v1a2 2 0 0 0 2 2Z"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx="7.5" cy="17.5" r="2.5" stroke={strokeColor} strokeWidth="1.8" fill="none" />
            <Circle cx="16.5" cy="17.5" r="2.5" stroke={strokeColor} strokeWidth="1.8" fill="none" />
            <Path d="M9 7v6M14 7v6" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          </>
        );
      case "chevron-down":
        return (
          <Path
            d="m6 9 6 6 6-6"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "map":
        return (
          <Path
            d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      case "users":
        return (
          <>
            <Path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx="9" cy="7" r="4" stroke={strokeColor} strokeWidth="1.8" fill="none" />
            <Path
              d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "badge-percent":
        return (
          <>
            <Path
              d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
            <Path
              d="m15 9-6 6M9 9h.01M15 15h.01"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "pin":
        return (
          <>
            <Path
              d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
            <Circle
              cx="12"
              cy="10"
              r="2.5"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={fillColor}
            />
          </>
        );
      case "bell":
        return (
          <>
            <Path
              d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
            <Path
              d="M10 21h4"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );
      case "search":
        return (
          <>
            <Circle
              cx="11"
              cy="11"
              r="7"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={fillColor}
            />
            <Path
              d="m20 20-4-4"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );
      case "filter":
        return (
          <Path
            d="M4 6h16M7 12h10M10 18h4"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        );
      case "food":
        return (
          <Path
            d="M6 3v8M10 3v8M6 7h4M8 11v10M16 3v18M16 3c4 3 4 7 0 9"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "car":
        return (
          <>
            <Path
              d="m5 17-1-1v-5l2-5h12l2 5v5l-1 1"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
            <Path
              d="M5 12h14M7 17v2M17 17v2"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <Circle
              cx="7"
              cy="14"
              r="1"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={strokeColor}
            />
            <Circle
              cx="17"
              cy="14"
              r="1"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={strokeColor}
            />
          </>
        );
      case "bag":
        return (
          <>
            <Path
              d="M5 8h14l-1 13H6L5 8Z"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
            <Path
              d="M9 9V6a3 3 0 0 1 6 0v3"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );
      case "box":
        return (
          <>
            <Path
              d="m4 7 8-4 8 4-8 4-8-4Z"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
            <Path
              d="M4 7v10l8 4 8-4V7M12 11v10"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "user":
        return (
          <>
            <Circle
              cx="12"
              cy="8"
              r="4"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={fillColor}
            />
            <Path
              d="M4 21a8 8 0 0 1 16 0"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );
      case "arrow":
        return (
          <Path
            d="m9 18 6-6-6-6"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "back":
        return (
          <Path
            d="m15 18-6-6 6-6"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "heart":
        return (
          <Path
            d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5a5.5 5.5 0 0 0 1.1-8.9Z"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "star":
        return (
          <Path
            d="m12 2 3 6 7 .9-5 4.8 1.3 6.8L12 17.3l-6.3 3.2L7 13.7 2 9l7-.9 3-6Z"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "clock":
        return (
          <>
            <Circle
              cx="12"
              cy="12"
              r="9"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={fillColor}
            />
            <Path
              d="M12 7v5l3 2"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );
      case "phone":
        return (
          <Path
            d="M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.7-3.1 19.5 19.5 0 0 1-6-6A20 20 0 0 1 2 4.1 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.9 2.1Z"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "shield":
        return (
          <Path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "home":
        return (
          <>
            <Path
              d="m3 11 9-8 9 8"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M5 10v11h14V10M9 21v-6h6v6"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
          </>
        );
      case "card":
        return (
          <>
            <Rect
              x="2"
              y="5"
              width="20"
              height="14"
              rx="2"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={fillColor}
            />
            <Path
              d="M2 10h20"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );
      case "wallet":
        return (
          <>
            <Path
              d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
            <Path
              d="M16 12h6v4h-6a2 2 0 0 1 0-4Z"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "list":
        return (
          <>
            <Path
              d="M9 6h12M9 12h12M9 18h12"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <Path
              d="M4 6h.01M4 12h.01M4 18h.01"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </>
        );
      case "cart":
        return (
          <>
            <Circle
              cx="9"
              cy="20"
              r="1"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={strokeColor}
            />
            <Circle
              cx="18"
              cy="20"
              r="1"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={strokeColor}
            />
            <Path
              d="M2 3h3l2.6 11.3a2 2 0 0 0 2 1.7h7.8a2 2 0 0 0 2-1.6L21 7H6"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
          </>
        );
      case "check":
        return (
          <Path
            d="m5 12 4 4L19 6"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      case "plus":
        return (
          <Path
            d="M12 5v14M5 12h14"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        );
      case "close":
        return (
          <Path
            d="M18 6 6 18M6 6l12 12"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        );
      case "trash":
        return (
          <>
            <Path
              d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
          </>
        );
      case "info":
        return (
          <>
            <Circle
              cx="12"
              cy="12"
              r="9"
              stroke={strokeColor}
              strokeWidth="1.8"
              fill={fillColor}
            />
            <Path
              d="M12 11v6M12 7.5h.01"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        );
      case "chat":
        return (
          <Path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "truck":
        return (
          <>
            <Path
              d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx="5.5" cy="18.5" r="2.5" stroke={strokeColor} strokeWidth="1.8" fill={fillColor} />
            <Circle cx="18.5" cy="18.5" r="2.5" stroke={strokeColor} strokeWidth="1.8" fill={fillColor} />
          </>
        );
      case "sliders":
        return (
          <>
            <Path
              d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "microphone":
      case "mic":
        return (
          <>
            <Path
              d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={fillColor}
            />
            <Path
              d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "scan":
        return (
          <>
            <Path
              d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      case "crown":
        return (
          <Path
            d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fillColor}
          />
        );
      case "logout":
        return (
          <>
            <Path
              d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H4"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );
      default:
        return (
          <Circle
            cx="12"
            cy="12"
            r="8"
            stroke={strokeColor}
            strokeWidth="1.8"
          />
        );
    }
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderPaths()}
    </Svg>
  );
}
