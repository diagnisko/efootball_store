"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconAlertTriangle, IconBell, IconEnvelope } from "@/components/Icons";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  type?: string;
  createdAt: string;
};

function playNotificationSound() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(520, context.currentTime + 0.16);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.21);
  oscillator.addEventListener("ended", () => void context.close());
}

function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const firstLoad = useRef(true);
  const knownUnread = useRef(0);

  useEffect(() => {
    let active = true;

    const ensureNotificationsPermission = async () => {
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") return;
      if (Notification.permission === "denied") return;
      try {
        await Notification.requestPermission();
      } catch {
        // ignore browser restrictions
      }
    };

    const loadNotifications = async () => {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok || !active) return;
      const result = (await response.json()) as { notifications: NotificationItem[] };
      const unreadCount = result.notifications.filter((item) => !item.isRead).length;
      if (!firstLoad.current && unreadCount > knownUnread.current) playNotificationSound();
      knownUnread.current = unreadCount;
      firstLoad.current = false;
      setNotifications(result.notifications);
    };

    void ensureNotificationsPermission();
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return notifications;
}

export function NotificationQuickAccess() {
  const [open, setOpen] = useState(false);
  const notifications = useNotifications();
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const unreadMessages = notifications.filter((item) => !item.isRead && (item.type === "new_message" || item.link === "/messages")).length;

  return (
    <div className="notification-actions">
      <Link href="/messages" className="nav-icon-link" aria-label={`${unreadMessages} message${unreadMessages > 1 ? "s" : ""} non lu${unreadMessages > 1 ? "s" : ""}`}>
        <IconEnvelope />
        {unreadMessages > 0 && <span className="nav-icon-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
      </Link>

      <div className="notification-center">
        <button
          className="notification-trigger"
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={`${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`}
          title="Notifications"
        >
          <IconBell />
          {unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}
        </button>
        {open && (
          <div className="notification-popover">
            <div className="notification-popover-head">
              <strong>Notifications</strong>
              <span>Actualisé automatiquement</span>
            </div>
            {notifications.length === 0 && <p className="notification-empty">Aucune notification.</p>}
            {notifications.slice(0, 6).map((notification) => {
              const content = (
                <div className={`notification-entry${notification.isRead ? "" : " is-unread"}`}>
                  <span className="notification-entry-dot">{!notification.isRead && <IconAlertTriangle />}</span>
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                  </div>
                </div>
              );
              return notification.link ? <Link key={notification.id} href={notification.link} onClick={() => setOpen(false)}>{content}</Link> : <div key={notification.id}>{content}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationBell() {
  return <NotificationQuickAccess />;
}

export function MessageInboxLink() {
  return <NotificationQuickAccess />;
}
