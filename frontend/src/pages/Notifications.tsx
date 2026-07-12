import React, { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../services/api';
import { Notification } from '../types';

type Filter = 'all' | 'unread' | string;

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-700',
};

const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  allocation: 'bg-purple-100 text-purple-700',
  maintenance: 'bg-orange-100 text-orange-700',
  alert: 'bg-red-100 text-red-700',
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<string[]>([]);

  const fetchNotifications = useCallback(async (p: number, f: Filter) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, limit: 10 };
      if (f === 'unread') params.status = 'unread';
      else if (f !== 'all') params.module = f;
      const res = await notificationsApi.getAll(params);
      setNotifications(res.data);
      setMeta(res.meta);
      const mods = [...new Set(res.data.map(n => n.module).filter(Boolean))];
      setModules(prev => [...new Set([...prev, ...mods])]);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(page, filter); }, [page, filter, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      fetchNotifications(page, filter);
    } catch (e) { console.error(e); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setSelected(null);
      fetchNotifications(page, filter);
    } catch (e) { console.error(e); }
  };

  const handleNotificationClick = (n: Notification) => {
    setSelected(n);
    if (n.status === 'unread') {
      handleMarkRead(n.id);
    }
  };

  return (
    <div className="p-6 h-full flex">
      <div className={`flex-1 ${selected ? 'mr-6' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <button onClick={handleMarkAllRead} className="text-sm text-primary hover:underline font-medium">Mark all read</button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'unread', ...modules] as Filter[]).map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No notifications</div>
          ) : notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 rounded-lg border cursor-pointer transition hover:shadow-sm ${n.status === 'unread' ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm font-semibold ${n.status === 'unread' ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</h3>
                    {n.status === 'unread' && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[n.type] || 'bg-gray-100 text-gray-600'}`}>{n.type}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[n.priority] || 'bg-gray-100 text-gray-600'}`}>{n.priority}</span>
                    {n.module && <span className="text-xs text-gray-500">{n.module}</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-6">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
            {Array.from({ length: meta.totalPages }, (_, i) => (
              <button key={i + 1} onClick={() => setPage(i + 1)} className={`px-3 py-1 border rounded text-sm ${page === i + 1 ? 'bg-primary text-white' : ''}`}>{i + 1}</button>
            ))}
            <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {selected && (
        <div className="w-96 bg-white border rounded-xl shadow-lg p-6 h-fit sticky top-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Notification Detail</h2>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900">{selected.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{selected.message}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[selected.type] || 'bg-gray-100 text-gray-600'}`}>{selected.type}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[selected.priority] || 'bg-gray-100 text-gray-600'}`}>{selected.priority}</span>
              {selected.module && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{selected.module}</span>}
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Receiver: {selected.receiver}</p>
              {selected.sender && <p>From: {selected.sender}</p>}
              <p>Created: {new Date(selected.createdAt).toLocaleString()}</p>
              {selected.readAt && <p>Read: {new Date(selected.readAt).toLocaleString()}</p>}
            </div>
            {selected.actionUrl && (
              <button className="w-full mt-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90">View Details</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { Notifications };
export default Notifications;
