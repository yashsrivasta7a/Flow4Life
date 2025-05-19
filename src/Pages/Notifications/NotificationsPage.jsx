import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react"; // or use any back icon you prefer

const NotificationItem = ({ notification, onMarkAsRead }) => (
  <div
    className={`rounded-xl shadow-md p-5 mb-5 border transition-all ${
      notification.read
        ? "bg-gray-50 border-gray-200"
        : "bg-blue-50 border-blue-400"
    }`}
  >
    <div className="flex justify-between items-center">
      <div>
        <h4 className="font-semibold text-lg text-blue-900">
          {notification.title}
        </h4>
        <p className="text-gray-700 mt-1">
          {notification.body || notification.message}
        </p>
        <small className="text-gray-500 block mt-2">
          {notification.timestamp
            ? new Date(notification.timestamp).toLocaleString()
            : ""}
        </small>
      </div>
      {!notification.read && (
        <button
          className="ml-4 px-4 py-1 bg-blue-600 text-white rounded-full font-medium shadow hover:bg-blue-700 transition"
          onClick={onMarkAsRead}
        >
          Mark as read
        </button>
      )}
    </div>
  </div>
);

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const db = getDatabase();
    const notifRef = ref(db, `notifications/${user.uid}`);

    const unsubscribe = onValue(notifRef, (snapshot) => {
      const data = snapshot.val() || {};
      const notifArr = Object.entries(data)
        .map(([id, n]) => ({ id, ...n }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setNotifications(notifArr);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const markAsRead = (id) => {
    const user = auth.currentUser;
    if (!user) return;
    const db = getDatabase();
    update(ref(db, `notifications/${user.uid}/${id}`), { read: true });
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur flex items-center gap-4 py-3 mb-6 border-b border-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-blue-100 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-blue-700" />
        </button>
        <h2 className="text-2xl font-bold text-blue-700">Notifications</h2>
      </div>
      {loading ? (
        <div className="text-center text-gray-500 py-10">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-gray-400 py-10">No notifications yet.</div>
      ) : (
        notifications.map((notif) => (
          <NotificationItem
            key={notif.id}
            notification={notif}
            onMarkAsRead={() => markAsRead(notif.id)}
          />
        ))
      )}
    </div>
  );
}
