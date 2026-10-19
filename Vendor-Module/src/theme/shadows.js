import { Platform } from 'react-native';
export const shadows = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    subtle: Platform.select({
        ios: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
        },
        android: {
            elevation: 1,
        },
        default: {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
    }),
    card: Platform.select({
        ios: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
        },
        android: {
            elevation: 2,
        },
        default: {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        },
    }),
    elevated: Platform.select({
        ios: {
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
        },
        android: {
            elevation: 4,
        },
        default: {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        },
    }),
};
