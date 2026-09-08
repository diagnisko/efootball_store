"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconAlertTriangle } from "@/components/Icons";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const firstLoad = useRef(true);
  const knownUnread = useRef(0);

  useEffect(() => {
    let active = true;
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

    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="notification-center">
      <button
        className="notification-trigger"
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          playNotificationSound();
        }}
        aria-label={`${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`}
        title="Notifications et activer le son"
      >
        <span aria-hidden="true">◉</span>
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
  );
}
