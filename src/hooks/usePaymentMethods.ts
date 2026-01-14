import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PaymentMethod {
  uuid_id: string;
  id: string;
  name: string;
  account_number: string;
  account_name: string;
  qr_code_url: string;
  active: boolean;
  sort_order: number;
  admin_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPaymentGroup {
  id: string;
  admin_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [adminGroups, setAdminGroups] = useState<AdminPaymentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminGroups = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_payment_groups')
        .select('*')
        .order('admin_name', { ascending: true });

      if (fetchError) throw fetchError;

      setAdminGroups(data || []);
    } catch (err) {
      console.error('Error fetching admin groups:', err);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      
      // First, get active admin groups
      const { data: activeGroups, error: groupsError } = await supabase
        .from('admin_payment_groups')
        .select('admin_name')
        .eq('is_active', true);

      if (groupsError) throw groupsError;

      // If no active groups, return empty array
      if (!activeGroups || activeGroups.length === 0) {
        setPaymentMethods([]);
        setError(null);
        return;
      }

      // Get payment methods from active admin groups
      const activeAdminNames = activeGroups.map(g => g.admin_name);
      
      const { data, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('active', true)
        .in('admin_name', activeAdminNames)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setPaymentMethods(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPaymentMethods = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setPaymentMethods(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching all payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAdminGroups = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_payment_groups')
        .select('*')
        .order('admin_name', { ascending: true });

      if (fetchError) throw fetchError;

      setAdminGroups(data || []);
    } catch (err) {
      console.error('Error fetching admin groups:', err);
    }
  };

  const addAdminGroup = async (adminName: string) => {
    try {
      const { data, error: insertError } = await supabase
        .from('admin_payment_groups')
        .insert({
          admin_name: adminName,
          is_active: false
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchAllAdminGroups();
      return data;
    } catch (err) {
      console.error('Error adding admin group:', err);
      throw err;
    }
  };

  const updateAdminGroup = async (adminName: string, isActive: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('admin_payment_groups')
        .update({ is_active: isActive })
        .eq('admin_name', adminName);

      if (updateError) throw updateError;

      await fetchAllAdminGroups();
      // Refetch payment methods to update customer view
      await fetchPaymentMethods();
    } catch (err) {
      console.error('Error updating admin group:', err);
      throw err;
    }
  };

  const deleteAdminGroup = async (adminName: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('admin_payment_groups')
        .delete()
        .eq('admin_name', adminName);

      if (deleteError) throw deleteError;

      await fetchAllAdminGroups();
    } catch (err) {
      console.error('Error deleting admin group:', err);
      throw err;
    }
  };

  const addPaymentMethod = async (method: Omit<PaymentMethod, 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('payment_methods')
        .insert({
          id: method.id,
          name: method.name,
          account_number: method.account_number,
          account_name: method.account_name,
          qr_code_url: method.qr_code_url,
          active: method.active,
          sort_order: method.sort_order,
          admin_name: method.admin_name || null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchAllPaymentMethods();
      return data;
    } catch (err) {
      console.error('Error adding payment method:', err);
      throw err;
    }
  };

  const updatePaymentMethod = async (uuidId: string, updates: Partial<PaymentMethod>) => {
    try {
      const { error: updateError } = await supabase
        .from('payment_methods')
        .update({
          name: updates.name,
          account_number: updates.account_number,
          account_name: updates.account_name,
          qr_code_url: updates.qr_code_url,
          active: updates.active,
          sort_order: updates.sort_order,
          admin_name: updates.admin_name !== undefined ? updates.admin_name : undefined
        })
        .eq('uuid_id', uuidId);

      if (updateError) throw updateError;

      await fetchAllPaymentMethods();
    } catch (err) {
      console.error('Error updating payment method:', err);
      throw err;
    }
  };

  const deletePaymentMethod = async (uuidId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('payment_methods')
        .delete()
        .eq('uuid_id', uuidId);

      if (deleteError) throw deleteError;

      await fetchAllPaymentMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      throw err;
    }
  };

  const reorderPaymentMethods = async (reorderedMethods: PaymentMethod[]) => {
    try {
      const updates = reorderedMethods.map((method, index) => ({
        uuid_id: method.uuid_id,
        sort_order: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('payment_methods')
          .update({ sort_order: update.sort_order })
          .eq('uuid_id', update.uuid_id);
      }

      await fetchAllPaymentMethods();
    } catch (err) {
      console.error('Error reordering payment methods:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
    fetchAdminGroups();
  }, []);

  return {
    paymentMethods,
    adminGroups,
    loading,
    error,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    reorderPaymentMethods,
    addAdminGroup,
    updateAdminGroup,
    deleteAdminGroup,
    refetch: fetchPaymentMethods,
    refetchAll: fetchAllPaymentMethods,
    refetchAdminGroups: fetchAllAdminGroups
  };
};