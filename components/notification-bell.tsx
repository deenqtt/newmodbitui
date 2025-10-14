// File: components/notification-bell.tsx
// Deskripsi: Komponen React untuk menampilkan ikon lonceng dan daftar notifikasi.
// DISABLED: Polling dihentikan sementara untuk menghindari ERR_TOO_MANY_REDIRECTS
"use client";

import { useState, useEffect } from "react";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

// DISABLED: Polling notification sementara untuk menghindari error console
 // const { isAuthenticated, isLoading } = useAuth();

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated, isLoading } = useAuth();

  // Fungsi untuk mengambil notifikasi dari API
  const fetchNotifications = async () => {
    // Don't fetch if not authenticated or still loading
    if (!isAuthenticated || isLoading) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const response = await axios.get<Notification[]>("/api/notifications");
      setNotifications(response.data);
      const newUnreadCount = response.data.filter((n) => !n.isRead).length;
      setUnreadCount(newUnreadCount);
    } catch (error) {
      // Reset on any error (like 401, redirects, etc.)
      setNotifications([]);
      setUnreadCount(0);
      // No console logging as requested
    }
  };

  // Fungsi untuk menandai notifikasi sebagai sudah dibaca
  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await axios.post("/api/notifications");
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      // Silenced
    }
  };

  // Fungsi untuk menghapus semua notifikasi secara permanen
  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;
    try {
      await axios.delete("/api/notifications");
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      // Silenced
    }
  };

  // DISABLED: Ambil notifikasi saat komponen pertama kali dimuat, dan atur polling
  // NOTE: Polling disabled sementara untuk menghindari ERR_TOO_MANY_REDIRECTS di console
  // Uncomment jika notification system sudah diperbaiki
  // useEffect(() => {
  //   fetchNotifications();
  //   const interval = setInterval(fetchNotifications, 10000);
  //   return () => clearInterval(interval);
  // }, [isAuthenticated, isLoading]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unreadCount > 0) {
          markAsRead();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="px-3 py-2">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 p-3"
              >
                <p className="text-sm font-medium whitespace-normal">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          )}
        </div>
        {/* --- TAMBAHKAN TOMBOL CLEAR ALL DI SINI --- */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()} // Mencegah dropdown tertutup saat diklik
              onClick={clearAllNotifications}
              className="flex items-center justify-center p-2 text-sm text-red-500 cursor-pointer focus:bg-red-50 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Clear All</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
