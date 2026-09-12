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

  return { notifications, setNotifications };
}

export function NotificationQuickAccess() {
  const [open, setOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { notifications, setNotifications } = useNotifications();
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const unreadMessages = notifications.filter((item) => !item.isRead && (item.type === "new_message" || item.link === "/messages")).length;

  const updateNotificationReadState = async (ids: string[]) => {
    if (!ids.length) return;
    const payload = { ids, markRead: true };
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setNotifications((current) => current.map((item) => (ids.includes(item.id) ? { ...item, isRead: true } : item)));
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  };

  const deleteSelectedNotifications = async () => {
    if (!selectedIds.length) return;
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    });
    setNotifications((current) => current.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

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
              <div className="notification-toolbar">
                <button type="button" className="notification-select-toggle" onClick={() => setSelectionMode((current) => !current)}>
                  {selectionMode ? "Annuler" : "Sélectionner"}
                </button>
                {selectedIds.length > 0 && (
                  <>
                    <button type="button" className="notification-action-btn" onClick={() => void updateNotificationReadState(selectedIds)}>
                      Marquer lu
                    </button>
                    <button type="button" className="notification-action-btn danger" onClick={() => void deleteSelectedNotifications()}>
                      Masquer
                    </button>
                  </>
                )}
              </div>
            </div>
            {notifications.length === 0 && <p className="notification-empty">Aucune notification.</p>}
            {notifications.slice(0, 6).map((notification) => {
              const content = (
                <div className={`notification-entry${notification.isRead ? "" : " is-unread"}${selectedIds.includes(notification.id) ? " selected" : ""}`}>
                  {selectionMode && (
                    <label className="notification-select-box" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(notification.id)}
                        onChange={() => toggleSelection(notification.id)}
                      />
                    </label>
                  )}
                  <span className="notification-entry-dot">{!notification.isRead && <IconAlertTriangle />}</span>
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.body}</p>
                  </div>
                </div>
              );

              if (notification.link) {
                return (
                  <Link
                    key={notification.id}
                    href={notification.link}
                    onClick={async () => {
                      if (selectionMode || notification.isRead) {
                        return;
                      }
                      setOpen(false);
                      await updateNotificationReadState([notification.id]);
                    }}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={notification.id}
                  type="button"
                  className="notification-entry-button"
                  onClick={async () => {
                    if (selectionMode) return;
                    await updateNotificationReadState([notification.id]);
                  }}
                >
                  {content}
                </button>
              );
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
