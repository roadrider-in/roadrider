import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { AppHeader } from '../../components/common/AppHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { useAppNavigation } from '../../navigation/NavigationContext';
export const EmptyErrorStatesScreen = () => {
    const { goBack } = useAppNavigation();
    return (<View style={styles.container}>
      <AppHeader title="System states" onBack={goBack}/>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <EmptyState title="No orders yet" description="New orders will appear here as soon as customers place them." actionText="Refresh orders" onAction={() => { }} style={styles.stateCard}/>

        <ErrorState title="Something went wrong" description="We couldn't load your catalog. Check your connection and try again." onRetry={() => { }} style={styles.stateCard}/>
      </ScrollView>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F7F6',
    },
    scrollContent: {
        padding: 18,
        paddingBottom: 28,
    },
    stateCard: {
        marginBottom: 20,
    },
});
