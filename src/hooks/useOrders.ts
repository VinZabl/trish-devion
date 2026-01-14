import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order, CreateOrderData, OrderStatus } from '../types';

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setOrders(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch a single order by ID
  const fetchOrderById = async (orderId: string): Promise<Order | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err) {
      console.error('Error fetching order:', err);
      return null;
    }
  };

  // Create a new order
  const createOrder = async (orderData: CreateOrderData): Promise<Order | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('orders')
        .insert({
          order_items: orderData.order_items,
          customer_info: orderData.customer_info,
          payment_method_id: orderData.payment_method_id,
          receipt_url: orderData.receipt_url,
          total_price: orderData.total_price,
          status: 'pending',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Refresh orders list if we're in admin view
      if (orders.length > 0) {
        await fetchOrders();
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      console.error('Error creating order:', err);
      return null;
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Refresh orders list
      await fetchOrders();

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
      console.error('Error updating order:', err);
      return false;
    }
  };

  // Subscribe to order updates (real-time)
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrderStatus,
  };
};
