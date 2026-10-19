import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { AppButton } from '../../components/common/AppButton';
import { AppIcon } from '../../components/common/AppIcon';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { useVendor } from '../../context/VendorContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';

export const ReviewsRatingsScreen = () => {
    const { goBack } = useAppNavigation();
    const { activeStore } = useVendor();
    const [reviews, setReviews] = useState([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);

    useEffect(() => {
        if (!isSupabaseConfigured || !activeStore?.id) {
            setReviews([]);
            setIsLoadingReviews(false);
            return;
        }

        let isMounted = true;
        const fetchReviews = async () => {
            setIsLoadingReviews(true);
            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .select('id, rating, comment, customer_name, created_at')
                    .eq('store_id', activeStore.id)
                    .order('created_at', { ascending: false });

                if (isMounted) {
                    if (!error && data) {
                        setReviews(data.map((r) => ({
                            id: r.id,
                            author: r.customer_name || 'Customer',
                            rating: r.rating || 5,
                            comment: r.comment || '',
                            timeAgo: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent',
                        })));
                    } else {
                        setReviews([]);
                    }
                    setIsLoadingReviews(false);
                }
            } catch {
                if (isMounted) {
                    setReviews([]);
                    setIsLoadingReviews(false);
                }
            }
        };

        fetchReviews();
        return () => {
            isMounted = false;
        };
    }, [activeStore?.id]);

    const totalReviews = reviews.length;
    const avgScore = totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
      : null;

    return (<View style={styles.container}>
      <AppHeader title="Reviews & ratings" onBack={goBack}/>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.eyebrow}>
          {totalReviews > 0 ? `${avgScore} AVERAGE · ${totalReviews} REVIEWS` : 'CUSTOMER REVIEWS & STORE RATINGS'}
        </Text>

        {/* Hero Rating Card */}
        <AppCard style={styles.ratingHero}>
          <Text style={styles.bigScore}>{avgScore ? avgScore : '—'}</Text>
          <View style={styles.ratingStarsBox}>
            <Text style={styles.starsText}>{avgScore ? '★★★★★' : '☆☆☆☆☆'}</Text>
            <Text style={styles.ratingSub}>
              {avgScore ? 'Customer satisfaction' : 'No ratings recorded yet'}
            </Text>
          </View>
        </AppCard>

        <Text style={[styles.eyebrow, { marginTop: 18 }]}>RECENT CUSTOMER FEEDBACK</Text>

        {reviews.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="star" size={32} color={colors.terracotta} />
            </View>
            <Text style={styles.emptyTitle}>No customer reviews yet</Text>
            <Text style={styles.emptySub}>
              Customer feedback and star ratings will appear here as orders are delivered and rated.
            </Text>
            <AppButton secondary onPress={goBack} style={styles.emptyBackBtn}>
              Back to Dashboard
            </AppButton>
          </AppCard>
        ) : (
          <View style={styles.reviewList}>
            {reviews.map((rev) => (<AppCard key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.author}>{rev.author}</Text>
                  <Text style={styles.stars}>{`★`.repeat(rev.rating)}</Text>
                  <Text style={styles.timeAgo}>{rev.timeAgo}</Text>
                </View>
                <Text style={styles.comment}>“{rev.comment}”</Text>
              </AppCard>))}
          </View>
        )}
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
        maxWidth: 680,
        width: '100%',
        alignSelf: 'center',
    },
    eyebrow: {
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        letterSpacing: 1.4,
        color: colors.terracotta,
        marginBottom: 12,
    },
    ratingHero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        padding: 18,
        marginBottom: 10,
    },
    bigScore: {
        fontSize: 38,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    ratingStarsBox: {
        justifyContent: 'center',
    },
    starsText: {
        fontSize: 14,
        letterSpacing: 2,
        color: colors.terracotta,
    },
    ratingSub: {
        fontSize: 10,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        marginTop: 4,
    },
    reviewList: {
        gap: 10,
    },
    reviewCard: {
        padding: 14,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 6,
    },
    author: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
    },
    stars: {
        fontSize: 11,
        color: colors.terracotta,
        letterSpacing: 1,
    },
    timeAgo: {
        fontSize: 9,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.warmGrey,
        marginLeft: 'auto',
    },
    comment: {
        fontSize: 11,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        lineHeight: 16,
    },
    emptyCard: {
        alignItems: 'center',
        padding: 32,
        borderRadius: radius.card,
        backgroundColor: colors.white,
        marginTop: 6,
    },
    emptyIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(163, 94, 71, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Poppins, sans-serif',
        color: colors.black,
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySub: {
        fontSize: 12,
        fontFamily: 'DM Sans, sans-serif',
        color: colors.charcoal,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 320,
        marginBottom: 20,
    },
    emptyBackBtn: {
        minWidth: 180,
    },
});
