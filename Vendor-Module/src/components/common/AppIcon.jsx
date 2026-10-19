import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline, Polygon } from 'react-native-svg';
import { colors } from '../../theme/colors';

export const AppIcon = ({
  name,
  size = 22,
  color = colors.charcoal,
  strokeWidth = 1.8,
}) => {
  const renderPaths = () => {
    switch (name) {
      case 'home':
        return (
          <>
            <Path d="M3 10.7 12 3l9 7.7" />
            <Path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7" />
          </>
        );
      case 'orders':
        return (
          <>
            <Path d="M6 3h12l1 18H5L6 3Z" />
            <Path d="M9 7a3 3 0 0 0 6 0M8 12h8M8 16h5" />
          </>
        );
      case 'catalog':
        return (
          <>
            <Rect x="3" y="3" width="7" height="7" rx="1" />
            <Rect x="14" y="3" width="7" height="7" rx="1" />
            <Rect x="3" y="14" width="7" height="7" rx="1" />
            <Rect x="14" y="14" width="7" height="7" rx="1" />
          </>
        );
      case 'wallet':
        return (
          <>
            <Path d="M4 6.5h14a2 2 0 0 1 2 2V19H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12" />
            <Path d="M15 11h7v5h-7a2.5 2.5 0 0 1 0-5Z" />
          </>
        );
      case 'user':
        return (
          <>
            <Circle cx="12" cy="8" r="4" />
            <Path d="M4 21a8 8 0 0 1 16 0" />
          </>
        );
      case 'bell':
        return (
          <>
            <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
          </>
        );
      case 'arrow':
        return <Path d="m15 18-6-6 6-6" />;
      case 'chevron':
        return <Path d="m9 18 6-6-6-6" />;
      case 'plus':
        return <Path d="M12 5v14M5 12h14" />;
      case 'search':
        return (
          <>
            <Circle cx="11" cy="11" r="7" />
            <Path d="m20 20-4-4" />
          </>
        );
      case 'check':
        return <Path d="m5 12 4 4L19 6" />;
      case 'close':
        return <Path d="m6 6 12 12M18 6 6 18" />;
      case 'upload':
        return (
          <>
            <Path d="M12 16V4m0 0L7 9m5-5 5 5" />
            <Path d="M4 15v5h16v-5" />
          </>
        );
      case 'camera':
        return (
          <>
            <Path d="M4 7h4l1.5-2h5L16 7h4v12H4V7Z" />
            <Circle cx="12" cy="13" r="3" />
          </>
        );
      case 'clock':
        return (
          <>
            <Circle cx="12" cy="12" r="9" />
            <Path d="M12 7v5l3 2" />
          </>
        );
      case 'store':
        return (
          <>
            <Path d="M4 10v10h16V10M3 10l2-6h14l2 6" />
            <Path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" />
          </>
        );
      case 'minus':
        return <Path d="M5 12h14" />;
      case 'star':
        return <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
      case 'tag':
        return (
          <>
            <Path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <Line x1="7" y1="7" x2="7.01" y2="7" />
          </>
        );
      case 'chart':
        return (
          <>
            <Line x1="18" y1="20" x2="18" y2="10" />
            <Line x1="12" y1="20" x2="12" y2="4" />
            <Line x1="6" y1="20" x2="6" y2="14" />
          </>
        );
      case 'map':
        return (
          <>
            <Polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" fill="none" />
            <Line x1="8" y1="2" x2="8" y2="18" />
            <Line x1="16" y1="6" x2="16" y2="22" />
          </>
        );
      case 'help':
        return (
          <>
            <Circle cx="12" cy="12" r="10" />
            <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <Line x1="12" y1="17" x2="12.01" y2="17" />
          </>
        );
      case 'box':
        return (
          <>
            <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <Polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <Line x1="12" y1="22.08" x2="12" y2="12" />
          </>
        );
      case 'menu':
      case 'hamburger':
      case 'menu-burger':
        return (
          <>
            <Line x1="3" y1="12" x2="21" y2="12" />
            <Line x1="3" y1="6" x2="21" y2="6" />
            <Line x1="3" y1="18" x2="21" y2="18" />
          </>
        );
      case 'filter':
        return (
          <Polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="none" />
        );
      case 'more':
      default:
        return (
          <>
            <Circle cx="5" cy="12" r="1.5" fill={color} />
            <Circle cx="12" cy="12" r="1.5" fill={color} />
            <Circle cx="19" cy="12" r="1.5" fill={color} />
          </>
        );
    }
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderPaths()}
    </Svg>
  );
};
