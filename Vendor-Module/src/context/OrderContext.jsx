import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { useVendor } from './VendorContext.jsx';

const OrderContext = createContext(undefined);

export const OrderProvider = ({ children }) => {
  const { activeStore } = useVendor();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('preparing');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderError, setOrderError] = useState(null);

  const resetOrderState = useCallback(() => {
    setOrders([]);
    setSelectedOrderId(null);
    setActiveTab('preparing');
    setIsLoadingOrders(false);
    setOrderError(null);
  }, []);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  useEffect(() => {
    let isMounted = true;

    // Strict account & store isolation: if no active store, clear orders and return
    if (!isSupabaseConfigured || !activeStore?.id) {
      setOrders([]);
      setIsLoadingOrders(false);
      setOrderError(null);
      return;
    }

    const loadOrders = async () => {
      try {
        if (isMounted) setIsLoadingOrders(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user || (await supabase.auth.getUser()).data?.user;
        if (!user) {
          if (isMounted) {
            setOrders([]);
            setIsLoadingOrders(false);
          }
          return;
        }

        // Scope orders strictly to the verified active store
        const { data: dbOrders, error } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            order_status,
            customer_name,
            customer_phone,
            delivery_address,
            customer_note,
            total_amount,
            prep_minutes,
            placed_at,
            created_at,
            store_id,
            order_items ( id, product_name, quantity, unit_price, total_price, is_veg )
          `)
          .eq('store_id', activeStore.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[OrderContext] Error fetching orders:', error.message);
          if (isMounted) {
            setOrderError(error.message);
            setIsLoadingOrders(false);
          }
          return;
        }

        if (isMounted) {
          setOrderError(null);
          if (dbOrders) {
            const formatted = dbOrders.map((ord) => {
              const currentStatus = ord.order_status || 'new';
              return {
                id: ord.id,
                orderNumber: ord.order_number || `#RR-${ord.id.slice(0, 5).toUpperCase()}`,
                status: currentStatus,
                orderStatus: currentStatus,
                customerName: ord.customer_name || 'Customer',
                customerPhone: ord.customer_phone || '',
                deliveryAddress: ord.delivery_address || '',
                customerNote: ord.customer_note || '',
                prepMinutes: ord.prep_minutes || 20,
                totalAmount: Number(ord.total_amount) || 0,
                createdAt: ord.placed_at || ord.created_at,
                timeRemaining:
                  currentStatus === 'ready'
                    ? 'Ready for pickup'
                    : currentStatus === 'completed'
                    ? 'Delivered'
                    : `${ord.prep_minutes || 20}:00`,
                items: (ord.order_items || []).map((i) => ({
                  id: i.id,
                  name: i.product_name || 'Item',
                  productName: i.product_name || 'Item',
                  quantity: i.quantity || 1,
                  price: Number(i.unit_price) || 0,
                  totalPrice: Number(i.total_price) || 0,
                  isVeg: i.is_veg !== false,
                })),
              };
            });

            setOrders(formatted);
          } else {
            setOrders([]);
          }
          setIsLoadingOrders(false);
        }
      } catch (err) {
        console.warn('[OrderContext] Notice:', err);
        if (isMounted) {
          setOrderError(err?.message || 'Failed to load orders');
          setIsLoadingOrders(false);
        }
      }
    };

    // Immediately clear stale orders from prior store before fetching new store orders
    setOrders([]);
    loadOrders();

    const interval = setInterval(loadOrders, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeStore?.id]);

  const acceptOrder = async (orderId, prepMinutes = 20) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'preparing',
              orderStatus: 'preparing',
              prepMinutes,
              timeRemaining: `${prepMinutes}:00`,
            }
          : ord
      )
    );
    setActiveTab('preparing');

    if (!activeStore?.id) return;

    try {
      await supabase
        .from('orders')
        .update({
          order_status: 'preparing',
          prep_minutes: prepMinutes,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('store_id', activeStore.id);
    } catch (err) {
      console.warn('[OrderContext] Could not update order in Supabase:', err);
    }
  };

  const rejectOrder = async (orderId, reason = 'Store busy') => {
    setOrders((prev) => prev.filter((ord) => ord.id !== orderId));

    if (!activeStore?.id) return;

    try {
      await supabase
        .from('orders')
        .update({
          order_status: 'rejected',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('store_id', activeStore.id);
    } catch (err) {
      console.warn('[OrderContext] Could not reject order in Supabase:', err);
    }
  };

  const markOrderReady = async (orderId) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'ready',
              orderStatus: 'ready',
              timeRemaining: 'Ready for pickup',
            }
          : ord
      )
    );
    setActiveTab('ready');

    if (!activeStore?.id) return;

    try {
      await supabase
        .from('orders')
        .update({
          order_status: 'ready',
          ready_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('store_id', activeStore.id);
    } catch (err) {
      console.warn('[OrderContext] Could not mark order ready in Supabase:', err);
    }
  };

  const completeOrder = async (orderId) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'completed',
              orderStatus: 'completed',
              timeRemaining: 'Picked up / Completed',
            }
          : ord
      )
    );

    if (!activeStore?.id) return;

    try {
      await supabase
        .from('orders')
        .update({
          order_status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('store_id', activeStore.id);
    } catch (err) {
      console.warn('[OrderContext] Could not complete order in Supabase:', err);
    }
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        activeTab,
        setActiveTab,
        selectedOrderId,
        setSelectedOrderId,
        selectedOrder,
        isLoadingOrders,
        orderError,
        acceptOrder,
        rejectOrder,
        markOrderReady,
        completeOrder,
        resetOrderState,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
