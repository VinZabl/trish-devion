import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { OrderStatus } from '../types';
import { Member } from '../types';

/** Minimal order fields for list; full order fetched when user opens detail */
type OrderListItem = { id: string; invoice_number?: string | null; status: OrderStatus; total_price: number; created_at: string };
import { supabase } from '../lib/supabase';
import OrderStatusModal from './OrderStatusModal';

const CUSTOMER_ORDER_IDS_KEY = 'customerPlaceOrderIds';
const MAX_STORED_ORDER_IDS = 30;

type StatusFilter = 'all' | 'pending' | 'done' | 'rejected';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: Member | null;
}

const getStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case 'pending':
    case 'processing':
      return 'Pending';
    case 'approved':
      return 'Done';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
};

const getStatusClass = (status: OrderStatus) => {
  switch (status) {
    case 'approved':
      return 'bg-green-500/20 text-green-400';
    case 'rejected':
      return 'bg-red-500/20 text-red-400';
    case 'pending':
    case 'processing':
      return 'bg-amber-500/20 text-amber-400';
    default:
      return 'bg-cafe-primary/20 text-cafe-text';
  }
};

const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose, currentMember }) => {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const listSelect = 'id, invoice_number, status, total_price, created_at';
        if (currentMember) {
          const { data, error } = await supabase
            .from('orders')
            .select(listSelect)
            .eq('member_id', currentMember.id)
            .order('created_at', { ascending: false })
            .limit(100);

          if (error) throw error;
          setOrders((data || []) as OrderListItem[]);
        } else {
          const raw = localStorage.getItem(CUSTOMER_ORDER_IDS_KEY);
          const ids: string[] = raw ? JSON.parse(raw) : [];
          if (ids.length === 0) {
            setOrders([]);
            setLoading(false);
            return;
          }
          const { data, error } = await supabase
            .from('orders')
            .select(listSelect)
            .in('id', ids)
            .order('created_at', { ascending: false });

          if (error) throw error;
          const list = (data || []) as OrderListItem[];
          setOrders(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isOpen, currentMember?.id]);

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return order.status === 'pending' || order.status === 'processing';
    if (statusFilter === 'done') return order.status === 'approved';
    if (statusFilter === 'rejected') return order.status === 'rejected';
    return true;
  });

  const handleClose = () => {
    setSelectedOrderId(null);
    onClose();
  };

  const handleSucceededClose = () => {
    setSelectedOrderId(null);
    onClose();
  };

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="My orders"
    >
      <div
        className="glass-card rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-cafe-text">My Orders</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 glass-strong rounded-lg hover:bg-cafe-primary/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-cafe-text" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-shrink-0 overflow-x-auto pb-1">
          {(['all', 'pending', 'done', 'rejected'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter
                  ? 'bg-cafe-primary text-white'
                  : 'bg-cafe-primary/10 text-cafe-textMuted hover:bg-cafe-primary/20 hover:text-cafe-text'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'done' ? 'Done' : filter === 'pending' ? 'Pending' : 'Rejected'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-cafe-primary animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-cafe-textMuted text-sm">
              {orders.length === 0 ? 'No orders yet.' : 'No orders match this filter.'}
            </div>
          ) : (
            filteredOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrderId(order.id)}
                className="w-full text-left glass-strong rounded-lg p-4 border border-cafe-primary/30 hover:bg-cafe-primary/10 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium text-cafe-text">
                      {order.invoice_number ? `#${order.invoice_number}` : `#${order.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-cafe-textMuted mt-0.5">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className="text-sm font-semibold text-cafe-text">₱{order.total_price.toFixed(2)}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedOrderId && (
        <OrderStatusModal
          orderId={selectedOrderId}
          isOpen={true}
          onClose={() => setSelectedOrderId(null)}
          onSucceededClose={handleSucceededClose}
        />
      )}
    </div>
  );

  return createPortal(content, document.body);
};

export default MyOrdersModal;
