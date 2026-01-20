import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MenuItem, CustomField } from '../types';

export const useMenu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      
      // Fetch menu items with their variations and add-ons
      // Order by category first, then by sort_order within each category
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          variations (*),
          add_ons (*)
        `)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;

      const formattedItems: MenuItem[] = items?.map(item => {
        // Calculate if discount is currently active (no date range check)
        const isDiscountActive = item.discount_active || false;
        
        // discount_price now stores decimal (0-1, e.g., 0.10 for 10%)
        const discountPercentage = item.discount_price !== null ? item.discount_price : undefined;

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          basePrice: item.base_price,
          category: item.category,
          popular: item.popular,
          available: item.available ?? true,
          image: item.image_url || undefined,
          sort_order: item.sort_order || 0,
          discountPercentage,
          discountActive: item.discount_active || false,
          // Legacy field for backward compatibility
          discountPrice: item.discount_price || undefined,
          effectivePrice: item.base_price, // Not used anymore, but kept for compatibility
          isOnDiscount: isDiscountActive && discountPercentage !== undefined,
          variations: (item.variations?.map(v => ({
            id: v.id,
            name: v.name,
            price: v.price,
            member_price: v.member_price !== null && v.member_price !== undefined ? v.member_price : undefined,
            reseller_price: v.reseller_price !== null && v.reseller_price !== undefined ? v.reseller_price : undefined,
            credits_amount: v.credits_amount !== null && v.credits_amount !== undefined ? v.credits_amount : undefined,
            description: v.description || undefined,
            sort_order: v.sort_order || 0,
            category: v.category || undefined,
            sort: v.sort !== null && v.sort !== undefined ? v.sort : undefined
          })) || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
          customFields: (item.custom_fields as CustomField[]) || [],
          subtitle: item.subtitle || undefined
        };
      }) || [];

      setMenuItems(formattedItems);
      setError(null);
    } catch (err) {
      console.error('Error fetching menu items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch menu items');
    } finally {
      setLoading(false);
    }
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    try {
      // Insert menu item
      const { data: menuItem, error: itemError } = await supabase
        .from('menu_items')
        .insert({
          name: item.name,
          description: item.description || null,
          base_price: item.basePrice,
          category: item.category,
          popular: item.popular || false,
          available: item.available ?? true,
          image_url: item.image || null,
          sort_order: item.sort_order !== undefined ? item.sort_order : 0,
          // Store discountPercentage (as decimal 0-1) in discount_price column
          discount_price: item.discountPercentage !== undefined ? item.discountPercentage : null,
          discount_active: item.discountActive || false,
          custom_fields: item.customFields || [],
          subtitle: item.subtitle || null
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Insert variations if any
      if (item.variations && item.variations.length > 0) {
        const { error: variationsError } = await supabase
          .from('variations')
          .insert(
            item.variations.map((v, index) => ({
              menu_item_id: menuItem.id,
              name: v.name,
              price: v.price,
              member_price: v.member_price !== undefined ? v.member_price : null,
              reseller_price: v.reseller_price !== undefined ? v.reseller_price : null,
              credits_amount: v.credits_amount !== undefined ? v.credits_amount : null,
              description: v.description || null,
              sort_order: v.sort_order !== undefined ? v.sort_order : index,
              category: v.category || null,
              sort: v.sort !== null && v.sort !== undefined ? v.sort : null
            }))
          );

        if (variationsError) throw variationsError;
      }


      await fetchMenuItems();
      return menuItem;
    } catch (err) {
      console.error('Error adding menu item:', err);
      throw err;
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    try {
      // Update menu item
      const { error: itemError } = await supabase
        .from('menu_items')
        .update({
          name: updates.name,
          description: updates.description !== undefined ? updates.description : null,
          base_price: updates.basePrice,
          category: updates.category,
          popular: updates.popular,
          available: updates.available,
          image_url: updates.image || null,
          sort_order: updates.sort_order !== undefined ? updates.sort_order : undefined,
          // Store discountPercentage (as decimal 0-1) in discount_price column
          discount_price: updates.discountPercentage !== undefined ? updates.discountPercentage : null,
          discount_start_date: null,
          discount_end_date: null,
          discount_active: updates.discountActive,
          custom_fields: updates.customFields !== undefined ? updates.customFields : undefined,
          subtitle: updates.subtitle !== undefined ? (updates.subtitle || null) : undefined
        })
        .eq('id', id);

      if (itemError) throw itemError;

      // Delete existing variations
      await supabase.from('variations').delete().eq('menu_item_id', id);

      // Insert new variations
      if (updates.variations && updates.variations.length > 0) {
        const { error: variationsError } = await supabase
          .from('variations')
          .insert(
            updates.variations.map((v, index) => ({
              menu_item_id: id,
              name: v.name,
              price: v.price,
              member_price: v.member_price !== undefined ? v.member_price : null,
              reseller_price: v.reseller_price !== undefined ? v.reseller_price : null,
              credits_amount: v.credits_amount !== undefined ? v.credits_amount : null,
              description: v.description || null,
              sort_order: v.sort_order !== undefined ? v.sort_order : index,
              category: v.category || null,
              sort: v.sort !== null && v.sort !== undefined ? v.sort : null
            }))
          );

        if (variationsError) throw variationsError;
      }


      await fetchMenuItems();
    } catch (err) {
      console.error('Error updating menu item:', err);
      throw err;
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchMenuItems();
    } catch (err) {
      console.error('Error deleting menu item:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  return {
    menuItems,
    loading,
    error,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    refetch: fetchMenuItems
  };
};