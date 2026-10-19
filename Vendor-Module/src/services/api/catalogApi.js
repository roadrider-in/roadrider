import { supabase } from '../../lib/supabase.js';

export const catalogApi = {
    fetchMenu: async (storeId) => {
        let catQuery = supabase.from('product_categories').select('*');
        let itemQuery = supabase.from('products').select('*');

        if (storeId) {
            catQuery = catQuery.eq('store_id', storeId);
            itemQuery = itemQuery.eq('store_id', storeId);
        }

        const [{ data: categories }, { data: items }] = await Promise.all([
            catQuery.order('display_order', { ascending: true }),
            itemQuery.order('created_at', { ascending: false }),
        ]);

        return { categories: categories || [], items: items || [] };
    },
    updateItemAvailability: async (itemId, isAvailable) => {
        const { data, error } = await supabase
            .from('products')
            .update({ is_available: isAvailable })
            .eq('id', itemId)
            .select();
        if (error) throw error;
        return { success: true, item: data?.[0] };
    },
    fetchGroceryProducts: async (storeId) => {
        let query = supabase.from('products').select('*');
        if (storeId) {
            query = query.eq('store_id', storeId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },
    updateStockCount: async (productId, stockCount) => {
        const { data, error } = await supabase
            .from('products')
            .update({ stock_count: stockCount })
            .eq('id', productId)
            .select();
        if (error) throw error;
        return { success: true, product: data?.[0] };
    },
};

