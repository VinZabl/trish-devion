import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberDiscount, MenuItem, Variation } from '../types';

export interface DiscountFormData {
  discount_percentage: number;
  capital_price: number;
  selling_price: number;
}

export const useMemberDiscounts = () => {
  const [discounts, setDiscounts] = useState<MemberDiscount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDiscountsByMember = async (memberId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('member_discounts')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts(data as MemberDiscount[]);
    } catch (err) {
      console.error('Error fetching discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountsByGame = async (memberId: string, menuItemId: string) => {
    try {
      if (!memberId || !menuItemId) {
        return [];
      }
      
      setLoading(true);
      const { data, error } = await supabase
        .from('member_discounts')
        .select('*')
        .eq('member_id', memberId)
        .eq('menu_item_id', menuItemId);

      if (error) {
        // Handle 406 or other errors gracefully
        if (error.code === 'PGRST116' || error.message?.includes('406')) {
          return [];
        }
        console.error('Error fetching discounts by game:', error);
        return [];
      }
      
      return (data || []) as MemberDiscount[];
    } catch (err) {
      console.error('Error fetching discounts by game:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const setDiscount = async (
    memberId: string,
    menuItemId: string,
    variationId: string | null,
    formData: DiscountFormData
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('member_discounts')
        .upsert({
          member_id: memberId,
          menu_item_id: menuItemId,
          variation_id: variationId,
          discount_percentage: formData.discount_percentage,
          capital_price: formData.capital_price,
          selling_price: formData.selling_price
        }, {
          onConflict: 'member_id,menu_item_id,variation_id'
        });

      if (error) {
        console.error('Error upserting discount:', error);
        throw error;
      }
      // Don't fetch all discounts for this member on every save (too expensive)
      // The caller will refresh what's needed
      return true;
    } catch (err) {
      console.error('Error setting discount:', err);
      return false;
    }
  };

  const deleteDiscount = async (discountId: string, memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('member_discounts')
        .delete()
        .eq('id', discountId);

      if (error) throw error;
      await fetchDiscountsByMember(memberId);
      return true;
    } catch (err) {
      console.error('Error deleting discount:', err);
      return false;
    }
  };

  const getDiscountForItem = async (
    memberId: string,
    menuItemId: string,
    variationId?: string
  ): Promise<MemberDiscount | null> => {
    try {
      const query = supabase
        .from('member_discounts')
        .select('*')
        .eq('member_id', memberId)
        .eq('menu_item_id', menuItemId);

      if (variationId) {
        query.eq('variation_id', variationId);
      } else {
        query.is('variation_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        // Handle 406 or other errors gracefully
        if (error.code === 'PGRST116' || error.message?.includes('406')) {
          return null;
        }
        console.error('Error fetching discount for item:', error);
        return null;
      }
      
      return (data || null) as MemberDiscount | null;
    } catch (err) {
      return null;
    }
  };

  return {
    discounts,
    loading,
    fetchDiscountsByMember,
    fetchDiscountsByGame,
    setDiscount,
    deleteDiscount,
    getDiscountForItem
  };
};
