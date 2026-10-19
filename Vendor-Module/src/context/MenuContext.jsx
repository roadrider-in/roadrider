import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { useVendor } from './VendorContext';

const DEFAULT_CATEGORIES = [
  { id: 'cat-all', name: 'All' },
  { id: 'cat-small-plates', name: 'Small plates' },
  { id: 'cat-bowls-mains', name: 'Bowls & mains' },
  { id: 'cat-flatbreads', name: 'Flatbreads' },
  { id: 'cat-momos', name: 'Momos & Dimsums' },
  { id: 'cat-beverages', name: 'Beverages' },
  { id: 'cat-desserts', name: 'Desserts' },
];

const MenuContext = createContext(undefined);

export const MenuProvider = ({ children }) => {
  const { activeStore } = useVendor();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadMenuItems = async () => {
      if (!isSupabaseConfigured || !activeStore?.id) {
        if (isMounted) setItems([]);
        return;
      }

      try {
        const { data: dbProducts, error } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', activeStore.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[MenuContext] Error fetching products:', error.message);
          return;
        }

        if (isMounted && dbProducts) {
          const mappedItems = dbProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category_name || p.category || 'Bowls & mains',
            price: String(p.price || 0),
            isVeg: p.is_veg !== undefined ? p.is_veg : true,
            isAvailable: p.is_available !== undefined ? p.is_available : true,
            variants: Array.isArray(p.variants) ? p.variants : [],
            addOns: Array.isArray(p.add_ons) ? p.add_ons : (Array.isArray(p.addons) ? p.addons : []),
            description: p.description || '',
          }));
          setItems(mappedItems);
        }
      } catch (err) {
        console.warn('[MenuContext] Notice:', err);
      }
    };

    loadMenuItems();

    return () => {
      isMounted = false;
    };
  }, [activeStore?.id]);

  const toggleItemAvailability = async (id) => {
    const targetItem = items.find((i) => i.id === id);
    const newAvail = !targetItem?.isAvailable;

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isAvailable: newAvail } : item
      )
    );

    if (id && !String(id).startsWith('m-')) {
      try {
        await supabase.from('products').update({ is_available: newAvail }).eq('id', id);
      } catch (err) {
        console.warn('[MenuContext] Could not update item availability:', err);
      }
    }
  };

  const addItem = async (newItem) => {
    const itemWithId = {
      ...newItem,
      id: `m-${Date.now()}`,
      isAvailable: newItem.isAvailable !== undefined ? newItem.isAvailable : true,
      variants: Array.isArray(newItem.variants) ? newItem.variants : [],
      addOns: Array.isArray(newItem.addOns) ? newItem.addOns : [],
    };
    setItems((prev) => [itemWithId, ...prev]);

    if (activeStore?.id) {
      try {
        const insertPayload = {
          store_id: activeStore.id,
          name: newItem.name,
          price: parseFloat(newItem.price) || 0,
          is_veg: newItem.isVeg !== undefined ? newItem.isVeg : true,
          is_available: newItem.isAvailable !== undefined ? newItem.isAvailable : true,
          description: newItem.description || '',
          variants: newItem.variants || [],
          add_ons: newItem.addOns || [],
        };
        if (newItem.categoryId) {
          insertPayload.category_id = newItem.categoryId;
        }
        const { data, error } = await supabase.from('products').insert(insertPayload).select();

        if (data?.[0]?.id) {
          setItems((prev) =>
            prev.map((i) => (i.id === itemWithId.id ? { ...i, id: data[0].id } : i))
          );
        }
      } catch (err) {
        console.warn('[MenuContext] Could not persist new product:', err);
      }
    }
  };

  const updateItem = async (id, updatedData) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    );

    if (id && !String(id).startsWith('m-')) {
      try {
        const updatePayload = {
          name: updatedData.name,
          price: parseFloat(updatedData.price) || 0,
          is_veg: updatedData.isVeg,
          is_available: updatedData.isAvailable,
          description: updatedData.description,
        };
        if (updatedData.categoryId) {
          updatePayload.category_id = updatedData.categoryId;
        }
        await supabase.from('products').update(updatePayload).eq('id', id);
      } catch (err) {
        console.warn('[MenuContext] Could not update product in Supabase:', err);
      }
    }
  };

  const deleteItem = async (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));

    if (id && !String(id).startsWith('m-')) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('[MenuContext] Could not delete product from Supabase:', err);
      }
    }
  };

  return (
    <MenuContext.Provider
      value={{
        categories,
        items,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        editingItem,
        setEditingItem,
        toggleItemAvailability,
        addItem,
        updateItem,
        deleteItem,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};

