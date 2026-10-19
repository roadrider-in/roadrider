import { supabase } from '../../lib/supabase.js';

export const orderApi = {
    fetchOrders: async (storeId) => {
        // Enforce store scoping: a vendor order query without a store ID must return empty
        if (!storeId) {
            return [];
        }

        const { data, error } = await supabase
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
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },
    acceptOrder: async (orderId, prepMinutes = 20, storeId = null) => {
        let query = supabase
            .from('orders')
            .update({
                order_status: 'preparing',
                prep_minutes: prepMinutes,
                accepted_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query.select();
        if (error) throw error;
        return { success: true, order: data?.[0] };
    },
    rejectOrder: async (orderId, reason = 'Store busy', storeId = null) => {
        let query = supabase
            .from('orders')
            .update({
                order_status: 'rejected',
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query.select();
        if (error) throw error;
        return { success: true, order: data?.[0] };
    },
    markReady: async (orderId, storeId = null) => {
        let query = supabase
            .from('orders')
            .update({
                order_status: 'ready',
                ready_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        if (storeId) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query.select();
        if (error) throw error;
        return { success: true, order: data?.[0] };
    },
};
