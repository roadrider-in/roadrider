import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
export const ToggleSwitch = ({ on, setOn, style }) => {
    return (<TouchableOpacity activeOpacity={0.8} onPress={() => setOn?.(!on)} style={[
            styles.track,
            on ? styles.trackOn : styles.trackOff,
            style,
        ]} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <View style={[
            styles.thumb,
            on ? styles.thumbOn : styles.thumbOff,
        ]}/>
    </TouchableOpacity>);
};
const styles = StyleSheet.create({
    track: {
        width: 48,
        height: 28,
        borderRadius: 20,
        padding: 3,
        justifyContent: 'center',
    },
    trackOn: {
        backgroundColor: colors.terracotta,
    },
    trackOff: {
        backgroundColor: colors.warmGrey,
    },
    thumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
    },
    thumbOn: {
        alignSelf: 'flex-end',
    },
    thumbOff: {
        alignSelf: 'flex-start',
    },
});
