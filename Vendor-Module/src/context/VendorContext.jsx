import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { sessionOtpGate } from '../services/sessionOtpGate.js';

export const DEFAULT_SCHEDULE = [
    { id: 'sched-mon', day: 'Monday', openTime: '10:00 AM', closeTime: '10:00 PM', isOpen: true },
    { id: 'sched-tue', day: 'Tuesday', openTime: '10:00 AM', closeTime: '10:00 PM', isOpen: true },
    { id: 'sched-wed', day: 'Wednesday', openTime: '10:00 AM', closeTime: '10:00 PM', isOpen: true },
    { id: 'sched-thu', day: 'Thursday', openTime: '10:00 AM', closeTime: '10:00 PM', isOpen: true },
    { id: 'sched-fri', day: 'Friday', openTime: '10:00 AM', closeTime: '11:00 PM', isOpen: true },
    { id: 'sched-sat', day: 'Saturday', openTime: '10:00 AM', closeTime: '11:30 PM', isOpen: true },
    { id: 'sched-sun', day: 'Sunday', openTime: '10:00 AM', closeTime: '10:00 PM', isOpen: true },
];

export const DEFAULT_HOLIDAYS = [
    { id: 'hol-1', date: '2026-10-02', displayDate: 'October 2, 2026', occasion: 'Gandhi Jayanti', isClosed: true },
    { id: 'hol-2', date: '2026-10-20', displayDate: 'October 20, 2026', occasion: 'Dussehra / Festival Closure', isClosed: true },
];

export const VendorContext = createContext(undefined);

export const VendorProvider = ({ children }) => {
    const [stores, setStores] = useState([]);
    const [activeStore, setActiveStore] = useState(null);
    const [vendor, setVendor] = useState(null);
    const [vendorId, setVendorId] = useState(null);
    const [vendorType, setVendorType] = useState('restaurant');
    const [isOnline, setIsOnline] = useState(false);
    const [isLoadingStores, setIsLoadingStores] = useState(true);
    const [storeError, setStoreError] = useState(null);
    const [operatingSchedule, setOperatingSchedule] = useState(DEFAULT_SCHEDULE);
    const [holidaySchedule, setHolidaySchedule] = useState(DEFAULT_HOLIDAYS);

    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const loadVendorStores = useCallback(async () => {
        if (!isSupabaseConfigured) {
            if (isMountedRef.current) setIsLoadingStores(false);
            return null;
        }
        try {
            if (isMountedRef.current) setIsLoadingStores(true);
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData?.session?.user || (await supabase.auth.getUser()).data?.user;
            if (!user || (typeof window !== 'undefined' && !sessionOtpGate.isSessionOtpVerified(user.id))) {
                if (isMountedRef.current) {
                    setStores([]);
                    setActiveStore(null);
                    setVendor(null);
                    setVendorId(null);
                    setIsOnline(false);
                    setIsLoadingStores(false);
                }
                return null;
            }

            // Query vendor record for current authenticated user
            const { data: vendorData, error: vendorErr } = await supabase
                .from('vendors')
                .select('id, vendor_type, business_name, owner_name, onboarding_status')
                .eq('user_id', user.id)
                .maybeSingle();

            if (vendorErr) {
                console.warn('[VendorContext] Vendor lookup notice:', vendorErr.message);
                if (isMountedRef.current) {
                    setStoreError(vendorErr.message);
                    setIsLoadingStores(false);
                }
                return null;
            }

            if (!vendorData) {
                if (isMountedRef.current) {
                    setStores([]);
                    setActiveStore(null);
                    setVendor(null);
                    setVendorId(null);
                    setIsLoadingStores(false);
                }
                return [];
            }

            if (isMountedRef.current) {
                setVendor(vendorData);
                setVendorId(vendorData.id);
                if (vendorData.vendor_type) {
                    setVendorType(vendorData.vendor_type);
                }
            }

            // Query store records for vendor using actual production schema columns
            const { data: dbStores, error: storeErr } = await supabase
                .from('stores')
                .select(`
                    id,
                    store_name,
                    business_type,
                    status,
                    vendor_id,
                    store_addresses ( address_line1, locality, city, state, postal_code )
                `)
                .eq('vendor_id', vendorData.id)
                .order('created_at', { ascending: true });

            if (storeErr) {
                console.warn('[VendorContext] Store fetch notice:', storeErr.message);
                if (isMountedRef.current) {
                    setStoreError(storeErr.message);
                    setIsLoadingStores(false);
                }
                return null;
            }

            if (isMountedRef.current) {
                setStoreError(null);
                if (dbStores && dbStores.length > 0) {
                    const mapped = dbStores.map((st) => {
                        const addr = Array.isArray(st.store_addresses) ? st.store_addresses[0] : st.store_addresses;
                        const resolvedName = st.store_name || vendorData.business_name || 'My Outlet';
                        const resolvedLocality = addr?.locality || addr?.address_line1 || 'Store Location';
                        const resolvedCity = addr?.city || '';
                        const resolvedType = st.business_type || vendorData.vendor_type || 'restaurant';
                        const isStoreOnline = st.status === 'ONLINE';

                        return {
                            id: st.id,
                            name: resolvedName,
                            store_name: st.store_name,
                            storeName: resolvedName,
                            locality: resolvedLocality,
                            addressLine1: addr?.address_line1 || '',
                            city: resolvedCity,
                            type: resolvedType,
                            businessType: resolvedType,
                            status: st.status || 'OFFLINE',
                            isOnline: isStoreOnline,
                            vendorId: st.vendor_id || vendorData.id,
                        };
                    });

                    setStores(mapped);
                    setActiveStore((prev) => {
                        if (prev && mapped.some((m) => m.id === prev.id)) {
                            return mapped.find((m) => m.id === prev.id) || mapped[0];
                        }
                        return mapped[0];
                    });
                    const currentType = mapped[0]?.type || vendorData.vendor_type || 'restaurant';
                    setVendorType(currentType);
                    setIsOnline(mapped[0]?.isOnline || false);
                    setIsLoadingStores(false);
                    return mapped;
                } else {
                    setStores([]);
                    setActiveStore(null);
                    setVendorType(vendorData.vendor_type || 'restaurant');
                    setIsOnline(false);
                    setIsLoadingStores(false);
                    return [];
                }
            }
            return null;
        } catch (err) {
            console.warn('[VendorContext] Load stores notice:', err);
            if (isMountedRef.current) {
                setStoreError(err?.message || 'Failed to load store data');
                setIsLoadingStores(false);
            }
            return null;
        }
    }, []);

    useEffect(() => {
        loadVendorStores();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadVendorStores();
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [loadVendorStores]);

    const switchStore = (storeId) => {
        const found = stores.find((s) => s.id === storeId);
        if (found) {
            setActiveStore(found);
            setVendorType(found.type);
            setIsOnline(Boolean(found.isOnline));
        }
    };

    const handleSetIsOnline = async (online) => {
        if (online && vendor?.onboarding_status !== 'verified' && vendor?.onboarding_status !== 'approved' && vendor?.onboarding_status !== 'live') {
            console.warn('[VendorContext] Store cannot go ONLINE until onboarding is verified by Master Admin.');
            setIsOnline(false);
            return;
        }
        setIsOnline(online);
        if (activeStore?.id) {
            const nextStatus = online ? 'ONLINE' : 'OFFLINE';
            setStores((prev) =>
                prev.map((s) => (s.id === activeStore.id ? { ...s, isOnline: online, status: nextStatus } : s))
            );
            setActiveStore((prev) => (prev ? { ...prev, isOnline: online, status: nextStatus } : null));

            try {
                await supabase.from('stores').update({ status: nextStatus }).eq('id', activeStore.id);
            } catch (err) {
                console.warn('[VendorContext] Could not update store online status:', err);
            }
        }
    };

    const resetVendorState = () => {
        setStores([]);
        setActiveStore(null);
        setVendor(null);
        setVendorId(null);
        setIsOnline(false);
        setIsLoadingStores(false);
        setStoreError(null);
    };

    return (
        <VendorContext.Provider
            value={{
                vendor,
                vendorId,
                vendorType,
                setVendorType,
                activeStore,
                setActiveStore,
                isOnline,
                setIsOnline: handleSetIsOnline,
                stores,
                switchStore,
                isLoadingStores,
                storeError,
                operatingSchedule,
                setOperatingSchedule,
                holidaySchedule,
                setHolidaySchedule,
                loadVendorStores,
                refreshVendorStores: loadVendorStores,
                resetVendorState,
            }}
        >
            {children}
        </VendorContext.Provider>
    );
};

export const useVendor = () => {
    const context = useContext(VendorContext);
    if (!context) {
        throw new Error('useVendor must be used within a VendorProvider');
    }
    return context;
};

