import React from 'react';
import { Bell, CheckCheck, Clock, ShieldAlert, Wrench, Car, Building2, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotificationDrawer({ isOpen, onClose }) {
  const { notifications, unreadCount, markNotificationRead } = useAuth();

  if (!isOpen) return null;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Complaint':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'Traffic':
        return <Car className="w-4 h-4 text-rose-600" />;
      case 'PropertyTax':
        return <Building2 className="w-4 h-4 text-emerald-600" />;
      case 'Utility':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-14 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-sm text-slate-800">Notifications</h4>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markNotificationRead(null)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markNotificationRead(n.id)}
                className={`p-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer flex items-start space-x-3 ${
                  !n.is_read ? 'bg-blue-50/40' : ''
                }`}
              >
                <div className="p-2 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                  {getCategoryIcon(n.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ml-2" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
