import { supabase } from '../../lib/supabase.js';

export const payoutApi = {
    fetchBalance: async (vendorId) => {
        if (!vendorId) {
            return {
                availableBalance: '₹0',
                scheduledDate: 'No scheduled settlements',
                grossSales: '₹0',
                netEarnings: '₹0',
            };
        }

        const { data: payouts, error } = await supabase
            .from('payouts')
            .select('*')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('[payoutApi] Error fetching payouts:', error.message);
        }

        const totalPaid = (payouts || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

        return {
            availableBalance: `₹${totalPaid.toLocaleString('en-IN')}`,
            scheduledDate: payouts && payouts.length > 0 ? 'Automated settlement' : 'No scheduled settlements',
            grossSales: `₹${totalPaid.toLocaleString('en-IN')}`,
            netEarnings: `₹${totalPaid.toLocaleString('en-IN')}`,
        };
    },
    fetchTransactions: async (vendorId) => {
        if (!vendorId) {
            return [];
        }

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },
};
