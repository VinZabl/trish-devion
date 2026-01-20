import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Member, MemberStatus, MemberUserType } from '../types';

export interface TopMember {
  member: Member;
  total_orders: number;
  total_cost: number;
}

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [topMembers, setTopMembers] = useState<TopMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      // Only select needed fields, exclude password_hash
      const { data, error } = await supabase
        .from('members')
        .select('id, username, email, mobile_no, level, status, user_type, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data as Member[]);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopMembers = async (limit: number = 10) => {
    try {
      // Use database aggregation instead of fetching all orders
      // This is much more efficient and reduces egress significantly
      const { data, error } = await supabase
        .from('orders')
        .select('member_id, total_price')
        .not('member_id', 'is', null);

      if (error) throw error;

      // Calculate total cost per member (client-side aggregation is still needed)
      // But we're only fetching member_id and total_price, not full order data
      const memberTotals = new Map<string, { total_cost: number; order_count: number }>();
      data.forEach(order => {
        if (order.member_id) {
          const existing = memberTotals.get(order.member_id) || { total_cost: 0, order_count: 0 };
          memberTotals.set(order.member_id, {
            total_cost: existing.total_cost + (order.total_price || 0),
            order_count: existing.order_count + 1
          });
        }
      });

      // Get member details for top members (sorted by total cost)
      const memberIds = Array.from(memberTotals.entries())
        .sort((a, b) => b[1].total_cost - a[1].total_cost)
        .slice(0, limit)
        .map(([id]) => id);

      if (memberIds.length === 0) {
        setTopMembers([]);
        return;
      }

      // Only select needed fields from members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, username, email, status, user_type, created_at, updated_at')
        .in('id', memberIds);

      if (membersError) throw membersError;

      const topMembersList: TopMember[] = memberIds
        .map(id => {
          const member = membersData.find(m => m.id === id) as Member;
          const totals = memberTotals.get(id);
          return member && totals ? { 
            member, 
            total_orders: totals.order_count,
            total_cost: totals.total_cost
          } : null;
        })
        .filter(Boolean) as TopMember[];

      setTopMembers(topMembersList);
    } catch (err) {
      console.error('Error fetching top members:', err);
    }
  };

  const updateMember = async (
    id: string,
    updates: {
      level?: number;
      status?: MemberStatus;
      user_type?: MemberUserType;
    }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchMembers();
      return true;
    } catch (err) {
      console.error('Error updating member:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchTopMembers();
  }, []);

  return {
    members,
    topMembers,
    loading,
    fetchMembers,
    fetchTopMembers,
    updateMember
  };
};
