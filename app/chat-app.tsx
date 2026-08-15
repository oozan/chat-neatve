"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { decryptMessage, encryptMessage, getDeviceId } from "./client-crypto";

type Message = {
  id: number | string;
  text: string;
  gif?: string;
  gifUrl?: string;
  gifPreviewUrl?: string;
  time: string;
  mine?: boolean;
  status?: "read" | "sent" | "failed";
  replyTo?: string;
  reactions?: string[];
};

type OnlineGif = {
  id: string;
  label: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  provider: "Tenor";
};

type Chat = {
  id: string;
  name: string;
  initials: string;
  preview: string;
  time: string;
  unread?: number;
  online?: boolean;
  pinned?: boolean;
  muted?: boolean;
  color: string;
  messages: Message[];
  kind?: "direct" | "group" | "saved";
};

const initialChats: Chat[] = [
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    preview: "The sunset there is unreal!",
    time: "10:42",
    unread: 2,
    online: true,
    pinned: true,
    color: "coral",
    messages: [
      { id: 1, text: "Hey! Did you make it to Lisbon?", time: "10:31" },
      {
        id: 2,
        text: "Just landed ☀️ The city already feels amazing.",
        time: "10:33",
        mine: true,
        status: "read",
      },
      {
        id: 3,
        text: "You have to go up to Miradouro da Senhora. The sunset there is unreal!",
        time: "10:38",
      },
      {
        id: 4,
        replyTo: "The sunset there is unreal!",
        text: "Adding it to today's plan. Send me your food list too?",
        time: "10:40",
        mine: true,
        status: "read",
      },
      { id: 5, text: "Already typing it up for you ✨", time: "10:42" },
    ],
  },
  {
    id: "product",
    name: "Product Crew",
    initials: "PC",
    preview: "Noah: New prototype is live",
    time: "09:18",
    unread: 5,
    pinned: true,
    color: "blue",
    messages: [
      { id: 1, text: "Morning team — the new prototype is live.", time: "09:12" },
      { id: 2, text: "Opening it now. The transitions look sharp!", time: "09:18", mine: true, status: "read" },
    ],
  },
  {
    id: "leo",
    name: "Leo Martins",
    initials: "LM",
    preview: "Voice message · 0:24",
    time: "Yesterday",
    color: "amber",
    messages: [
      { id: 1, text: "Voice message · 0:24", time: "18:06" },
      { id: 2, text: "I'll listen on the way home.", time: "18:10", mine: true, status: "read" },
    ],
  },
  {
    id: "nina",
    name: "Nina & 6 others",
    initials: "N+",
    preview: "Photo",
    time: "Yesterday",
    muted: true,
    color: "violet",
    messages: [{ id: 1, text: "Photo · Weekend plans are officially happening!", time: "17:44" }],
  },
  {
    id: "saved",
    name: "Saved Messages",
    initials: "★",
    preview: "Train tickets.pdf",
    time: "Mon",
    color: "cyan",
    messages: [
      { id: 1, text: "Train tickets.pdf", time: "08:15", mine: true, status: "sent" },
      { id: 2, text: "Ideas for the autumn launch", time: "08:17", mine: true, status: "sent" },
    ],
  },
  {
    id: "omar",
    name: "Omar Aziz",
    initials: "OA",
    preview: "See you Thursday!",
    time: "Sun",
    color: "green",
    messages: [{ id: 1, text: "See you Thursday!", time: "16:22" }],
  },
];

const formatTime = () =>
  new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

const emojiGroups = [
  { name: "Smileys", icon: "☺", emojis: ["😀", "😃", "😄", "😁", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤩", "🥳", "🤗", "🤔", "🫡", "🥹", "😴", "😭", "😤", "🤯", "😱", "🙈", "🫠"] },
  { name: "Gestures", icon: "✌", emojis: ["👋", "🤚", "🖐️", "✋", "👌", "🤌", "🤏", "✌️", "🤞", "🫶", "🤟", "🤙", "👈", "👉", "👆", "👇", "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "🫵"] },
  { name: "Hearts", icon: "♡", emojis: ["❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❣️", "💌", "💋"] },
  { name: "Fun", icon: "✦", emojis: ["✨", "🔥", "🎉", "🎊", "🎈", "🎁", "🏆", "⚡", "💫", "⭐", "🌈", "☀️", "🌙", "🌊", "🌸", "🍀", "🚀", "💯", "✅", "💡", "🎵", "📸", "☕", "🍕"] },
];

const gifs = [
  { id: "celebrate", label: "Celebrate!", emoji: "🎉", colors: ["#7057db", "#ff7ca8"] },
  { id: "love-it", label: "Love it", emoji: "😍", colors: ["#ef5a70", "#ffb06d"] },
  { id: "lets-go", label: "Let's go!", emoji: "🚀", colors: ["#116e8b", "#53c9a8"] },
  { id: "wow", label: "WOW", emoji: "🤯", colors: ["#ce653f", "#f4ca64"] },
  { id: "thank-you", label: "Thank you", emoji: "🫶", colors: ["#9859a8", "#ef9ab0"] },
  { id: "good-job", label: "Good job!", emoji: "👏", colors: ["#2871a5", "#6bbbd2"] },
  { id: "hello", label: "Hello!", emoji: "👋", colors: ["#168568", "#8bcf8e"] },
  { id: "coffee", label: "Coffee?", emoji: "☕", colors: ["#765448", "#c99b73"] },
];

function decodeStoredMessage(value: string) {
  if (value.startsWith("[online-gif]")) {
    try {
      const data = JSON.parse(value.slice(12)) as { id: string; label: string; url: string; previewUrl: string };
      if (data.id && data.label && data.url && data.previewUrl) {
        return { text: data.label, gif: `tenor-${data.id}`, gifUrl: data.url, gifPreviewUrl: data.previewUrl };
      }
    } catch {
      return { text: "GIF" };
    }
  }
  const match = value.match(/^\[gif:([a-z0-9-]+)]\s*(.*)$/i);
  return match ? { text: match[2], gif: match[1] } : { text: value };
}

export function ChatApp() {
  const [chats, setChats] = useState(initialChats);
  const [activeId, setActiveId] = useState("maya");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<"emoji" | "gif">("emoji");
  const [emojiGroup, setEmojiGroup] = useState("Smileys");
  const [gifQuery, setGifQuery] = useState("");
  const [onlineGifs, setOnlineGifs] = useState<OnlineGif[]>([]);
  const [gifSearchState, setGifSearchState] = useState<"idle" | "loading" | "ready" | "unconfigured" | "error">("idle");
  const [reactionTarget, setReactionTarget] = useState<Message["id"] | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const [syncState, setSyncState] = useState<"online" | "syncing" | "offline">("syncing");
  const searchRef = useRef<HTMLInputElement>(null);
  const messageSpaceRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((chat) => chat.id === activeId) ?? chats[0];
  const visibleChats = useMemo(
    () => chats.filter((chat) => chat.name.toLowerCase().includes(query.toLowerCase())),
    [chats, query],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileChatOpen(false);
        window.setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        setShowNewChat(false);
        setShowMediaPicker(false);
        setReactionTarget(null);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadConversations() {
      try {
        const response = await fetch("/api/conversations", { headers: { "x-whisper-device-id": getDeviceId() } });
        if (!response.ok) throw new Error("Conversation sync failed");
        const payload = await response.json() as {
          conversations?: Array<{ id: string; title: string; kind: Chat["kind"]; lastActivity: string; messageCount: number }>;
        };
        if (cancelled) return;
        setChats((current) => {
          const known = new Set(current.map((chat) => chat.id));
          const restored = (payload.conversations ?? []).filter((chat) => !known.has(chat.id)).map((chat, index): Chat => ({
            id: chat.id,
            name: chat.title,
            initials: chat.title.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
            preview: chat.messageCount ? "Encrypted conversation" : "No messages yet",
            time: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(chat.lastActivity)),
            color: ["green", "blue", "violet", "amber", "cyan", "coral"][index % 6],
            messages: [],
            kind: chat.kind,
          }));
          return restored.length ? [...restored, ...current] : current;
        });
        setSyncState("online");
      } catch {
        if (!cancelled) setSyncState("offline");
      }
    }
    void loadConversations();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!showMediaPicker || pickerTab !== "gif") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setGifSearchState("loading");
      try {
        const response = await fetch(`/api/gifs${gifQuery.trim() ? `?q=${encodeURIComponent(gifQuery.trim())}` : ""}`, { signal: controller.signal });
        const payload = await response.json() as { configured?: boolean; results?: OnlineGif[] };
        if (!payload.configured) {
          setOnlineGifs([]);
          setGifSearchState("unconfigured");
          return;
        }
        if (!response.ok) throw new Error("GIF search failed");
        setOnlineGifs(payload.results ?? []);
        setGifSearchState("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setOnlineGifs([]);
          setGifSearchState("error");
        }
      }
    }, gifQuery.trim() ? 350 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [gifQuery, pickerTab, showMediaPicker]);

  useEffect(() => {
    let cancelled = false;

    async function loadEncryptedMessages() {
      setSyncState((current) => current === "offline" ? "syncing" : current);
      try {
        const response = await fetch(`/api/messages?conversationId=${encodeURIComponent(activeId)}`, {
          headers: { "x-whisper-device-id": getDeviceId() },
        });
        if (!response.ok) throw new Error("Message sync failed");
        const payload = await response.json() as {
          messages?: Array<{ id: string; ciphertext: string; iv: string; createdAt: string; mine: boolean }>;
        };
        const decrypted = (await Promise.all((payload.messages ?? []).map(async (message) => {
          try {
            const content = decodeStoredMessage(await decryptMessage(activeId, message));
            return {
              id: message.id,
              ...content,
              time: new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(message.createdAt)),
              mine: message.mine,
              status: message.mine ? "read" as const : undefined,
            };
          } catch {
            return null;
          }
        }))).filter((message): message is NonNullable<typeof message> => message !== null);
        if (cancelled || decrypted.length === 0) return;
        setChats((current) => current.map((chat) => {
          if (chat.id !== activeId) return chat;
          const known = new Set(chat.messages.map((message) => message.id));
          const restored = decrypted.filter((message) => !known.has(message.id));
          return restored.length ? { ...chat, messages: [...chat.messages, ...restored] } : chat;
        }));
        setSyncState("online");
      } catch {
        if (!cancelled) setSyncState("offline");
      }
    }

    void loadEncryptedMessages();
    const interval = window.setInterval(loadEncryptedMessages, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [activeId]);

  useEffect(() => {
    const element = messageSpaceRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [activeChat.messages.length, activeId]);

  function selectChat(id: string) {
    setActiveId(id);
    setMobileChatOpen(true);
    setShowInfo(false);
    setChats((current) => current.map((chat) => (chat.id === id ? { ...chat, unread: 0 } : chat)));
  }

  async function persistEncryptedMessage(chat: Chat, message: Message) {
    try {
      const storedContent = message.gifUrl
        ? `[online-gif]${JSON.stringify({ id: message.gif?.replace(/^tenor-/, ""), label: message.text, url: message.gifUrl, previewUrl: message.gifPreviewUrl ?? message.gifUrl })}`
        : message.gif ? `[gif:${message.gif}] ${message.text}` : message.text;
      const encrypted = await encryptMessage(chat.id, storedContent);
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-whisper-device-id": getDeviceId() },
        body: JSON.stringify({
          conversationId: chat.id,
          conversationTitle: chat.name,
          ...encrypted,
        }),
      });
      if (!response.ok) throw new Error("Message storage failed");
      const payload = await response.json() as { message: { id: string } };
      setChats((current) => current.map((item) =>
        item.id === chat.id
          ? { ...item, messages: item.messages.map((entry) => entry.id === message.id ? { ...entry, id: payload.message.id, status: "read" } : entry) }
          : item,
      ));
    } catch {
      setChats((current) => current.map((item) =>
        item.id === chat.id
          ? { ...item, messages: item.messages.map((entry) => entry.id === message.id ? { ...entry, status: "failed" } : entry) }
          : item,
      ));
      flash("Message could not be stored securely. Tap to retry.");
    }
  }

  async function createConversation(event: FormEvent) {
    event.preventDefault();
    const title = newChatName.trim();
    if (!title || creatingChat) return;
    setCreatingChat(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json", "x-whisper-device-id": getDeviceId() },
        body: JSON.stringify({ title, kind: "direct" }),
      });
      const payload = await response.json() as { conversation?: { id: string; title: string }; error?: string };
      if (!response.ok || !payload.conversation) throw new Error(payload.error ?? "Conversation creation failed");
      const chat: Chat = {
        id: payload.conversation.id,
        name: payload.conversation.title,
        initials: payload.conversation.title.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
        preview: "No messages yet",
        time: "Now",
        color: "green",
        messages: [],
        kind: "direct",
      };
      setChats((current) => [chat, ...current]);
      setActiveId(chat.id);
      setMobileChatOpen(true);
      setNewChatName("");
      setShowNewChat(false);
      setSyncState("online");
      flash("Private conversation created");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Conversation could not be created");
    } finally {
      setCreatingChat(false);
    }
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const message: Message = {
      id: `local-${crypto.randomUUID()}`,
      text,
      time: formatTime(),
      mine: true,
      status: "sent",
    };

    setChats((current) =>
      current.map((chat) =>
        chat.id === activeChat.id
          ? { ...chat, preview: text, time: message.time, messages: [...chat.messages, message] }
          : chat,
      ),
    );
    setDraft("");
    setShowMediaPicker(false);
    void persistEncryptedMessage(activeChat, message);
  }

  function sendGif(gif: (typeof gifs)[number]) {
    const message: Message = {
      id: `local-${crypto.randomUUID()}`,
      text: gif.label,
      gif: gif.id,
      time: formatTime(),
      mine: true,
      status: "sent",
    };
    setChats((current) => current.map((chat) => chat.id === activeChat.id
      ? { ...chat, preview: `GIF · ${gif.label}`, time: message.time, messages: [...chat.messages, message] }
      : chat));
    setShowMediaPicker(false);
    setGifQuery("");
    void persistEncryptedMessage(activeChat, message);
  }

  function sendOnlineGif(gif: OnlineGif) {
    const message: Message = {
      id: `local-${crypto.randomUUID()}`,
      text: gif.label,
      gif: `tenor-${gif.id}`,
      gifUrl: gif.url,
      gifPreviewUrl: gif.previewUrl,
      time: formatTime(),
      mine: true,
      status: "sent",
    };
    setChats((current) => current.map((chat) => chat.id === activeChat.id
      ? { ...chat, preview: `GIF · ${gif.label}`, time: message.time, messages: [...chat.messages, message] }
      : chat));
    setShowMediaPicker(false);
    setGifQuery("");
    void persistEncryptedMessage(activeChat, message);
  }

  function reactToMessage(messageId: Message["id"], reaction: string) {
    setChats((current) => current.map((chat) => chat.id === activeChat.id ? {
      ...chat,
      messages: chat.messages.map((message) => message.id === messageId
        ? { ...message, reactions: message.reactions?.includes(reaction) ? message.reactions.filter((item) => item !== reaction) : [...(message.reactions ?? []), reaction] }
        : message),
    } : chat));
    setReactionTarget(null);
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2200);
  }

  return (
    <main className="app-shell">
      <section className={`sidebar ${mobileChatOpen ? "sidebar-hidden-mobile" : ""}`} aria-label="Conversation list">
        <header className="sidebar-header">
          <button className="avatar avatar-me" aria-label="Open profile" onClick={() => flash("Profile settings are ready for the next step")}>OZ</button>
          <div className="brand-lockup">
            <strong>Whisper</strong>
            <span><i className={`status-dot status-${syncState}`} /> {syncState === "online" ? "encrypted · synced" : syncState === "syncing" ? "connecting securely…" : "offline · messages queued"}</span>
          </div>
          <button className="icon-button new-chat" aria-label="Start new chat" onClick={() => setShowNewChat(true)}>＋</button>
        </header>

        <div className="search-wrap">
          <span aria-hidden="true">⌕</span>
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search conversations" />
          <kbd>⌘ K</kbd>
        </div>

        <nav className="filter-tabs" aria-label="Conversation filters">
          <button className={!query ? "active" : ""} onClick={() => setQuery("")}>All <span>{chats.length}</span></button>
          <button onClick={() => setQuery("Crew")}>Groups</button>
          <button onClick={() => setQuery("Saved")}>Saved</button>
        </nav>

        <div className="conversation-list">
          {visibleChats.length === 0 ? (
            <div className="empty-list">No conversations match “{query}”.</div>
          ) : visibleChats.map((chat) => (
            <button
              key={chat.id}
              className={`conversation ${chat.id === activeId ? "active" : ""}`}
              onClick={() => selectChat(chat.id)}
            >
              <span className={`avatar avatar-${chat.color}`}>{chat.initials}{chat.online && <i className="online-dot" />}</span>
              <span className="conversation-copy">
                <span className="conversation-title"><strong>{chat.name}</strong><time>{chat.time}</time></span>
                <span className="conversation-preview">
                  <span>{chat.preview}</span>
                  <span className="conversation-badges">
                    {chat.pinned && <b title="Pinned">◆</b>}
                    {chat.muted && <b title="Muted">×</b>}
                    {!!chat.unread && <em>{chat.unread}</em>}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>

        <footer className="privacy-footer"><span>⌁</span> End-to-end encrypted</footer>
      </section>

      <section className={`chat-panel ${mobileChatOpen ? "chat-open-mobile" : ""}`} aria-label={`Chat with ${activeChat.name}`}>
        <header className="chat-header">
          <button className="icon-button back-button" aria-label="Back to chats" onClick={() => setMobileChatOpen(false)}>‹</button>
          <button className={`avatar avatar-${activeChat.color}`} aria-label={`Open ${activeChat.name} details`} onClick={() => setShowInfo(true)}>{activeChat.initials}</button>
          <button className="chat-identity" onClick={() => setShowInfo(true)}>
            <strong>{activeChat.name}</strong>
            <span>{activeChat.online ? "online now" : "last seen recently"}</span>
          </button>
          <div className="chat-actions">
            <button className="icon-button" aria-label="Search chat" onClick={() => flash("Search in this conversation")}>⌕</button>
            <button className="icon-button" aria-label="Start secure call" onClick={() => flash(`Calling ${activeChat.name} securely…`)}>♢</button>
            <button className="icon-button" aria-label="More options" onClick={() => setShowInfo((value) => !value)}>•••</button>
          </div>
        </header>

        <div className="encryption-banner">
          <span>⌁</span>
          <p><strong>Messages are end-to-end encrypted.</strong> No one outside this chat can read them.</p>
        </div>

        <div className="message-space" ref={messageSpaceRef}>
          <div className="day-divider"><span>Today</span></div>
          <div className="messages" aria-live="polite">
            {activeChat.messages.map((message) => (
              <div key={message.id} className={`message-row ${message.mine ? "mine" : "theirs"}`}>
                {!message.mine && <span className={`mini-avatar avatar-${activeChat.color}`}>{activeChat.initials}</span>}
                <div className="bubble">
                  {message.replyTo && <div className="reply-quote">{message.replyTo}</div>}
                  {message.gifUrl ? (
                    <div className="online-gif-message">
                      <Image src={message.gifUrl} alt={message.text} width={640} height={480} unoptimized />
                      <span className="online-gif-label">{message.text}</span>
                      <i>GIF · TENOR</i>
                    </div>
                  ) : message.gif ? (() => {
                    const gif = gifs.find((item) => item.id === message.gif) ?? gifs[0];
                    return <div className={`gif-message gif-${gif.id}`} style={{ "--gif-a": gif.colors[0], "--gif-b": gif.colors[1] } as CSSProperties}><span>{gif.emoji}</span><strong>{gif.label}</strong><i>GIF</i></div>;
                  })() : <p>{message.text}</p>}
                  <span className="message-meta">
                    {message.time}
                    {message.mine && (message.status === "failed" ? (
                      <button className="retry-message" aria-label="Retry sending message" title="Retry" onClick={() => void persistEncryptedMessage(activeChat, message)}>!</button>
                    ) : <b aria-label={message.status === "read" ? "Read" : "Sent"}>{message.status === "read" ? "✓✓" : "✓"}</b>)}
                  </span>
                  <button className="add-reaction" aria-label="React to message" onClick={() => setReactionTarget(reactionTarget === message.id ? null : message.id)}>☺</button>
                  {reactionTarget === message.id && (
                    <div className="reaction-picker">
                      {["❤️", "😂", "😮", "😢", "🔥", "👍", "👎", "🎉"].map((reaction) => <button key={reaction} onClick={() => reactToMessage(message.id, reaction)}>{reaction}</button>)}
                    </div>
                  )}
                  {!!message.reactions?.length && <div className="message-reactions">{message.reactions.map((reaction) => <button key={reaction} onClick={() => reactToMessage(message.id, reaction)}>{reaction} <span>1</span></button>)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="composer-zone">
          {showMediaPicker && (
            <div className="media-picker" aria-label="Emoji and GIF picker">
              <div className="picker-tabs">
                <button className={pickerTab === "emoji" ? "active" : ""} onClick={() => setPickerTab("emoji")}>Emoji</button>
                <button className={pickerTab === "gif" ? "active" : ""} onClick={() => setPickerTab("gif")}>GIFs</button>
                <button className="picker-close" onClick={() => setShowMediaPicker(false)} aria-label="Close picker">×</button>
              </div>
              {pickerTab === "emoji" ? (
                <>
                  <div className="emoji-categories">{emojiGroups.map((group) => <button key={group.name} className={emojiGroup === group.name ? "active" : ""} title={group.name} onClick={() => setEmojiGroup(group.name)}>{group.icon}</button>)}</div>
                  <p className="picker-label">{emojiGroup}</p>
                  <div className="emoji-grid">{emojiGroups.find((group) => group.name === emojiGroup)?.emojis.map((emoji) => <button key={emoji} onClick={() => setDraft((value) => value + emoji)}>{emoji}</button>)}</div>
                </>
              ) : (
                <>
                  <div className="gif-search"><span>⌕</span><input value={gifQuery} onChange={(event) => setGifQuery(event.target.value)} placeholder="Search Tenor and Whisper GIFs" aria-label="Search GIFs online" />{gifSearchState === "loading" && <i className="gif-search-spinner" aria-label="Searching" />}</div>
                  <div className="gif-source-heading"><strong>{gifQuery.trim() ? "Online results" : "Trending online"}</strong><span>powered by Tenor</span></div>
                  {gifSearchState === "unconfigured" && <div className="gif-online-note"><strong>Online search is ready to connect</strong><span>Add a Tenor API key to search the web. Your current Whisper GIFs remain below.</span></div>}
                  {gifSearchState === "error" && <div className="gif-online-note error"><strong>Couldn’t reach online GIFs</strong><span>Showing the built-in collection instead.</span></div>}
                  {gifSearchState === "ready" && onlineGifs.length === 0 && <div className="gif-online-note"><strong>No online matches</strong><span>Try another phrase or choose a Whisper GIF.</span></div>}
                  {!!onlineGifs.length && <div className="online-gif-grid">{onlineGifs.map((gif) => <button key={gif.id} onClick={() => sendOnlineGif(gif)} className="online-gif-card" title={`Send ${gif.label}`}><Image src={gif.previewUrl} alt={gif.label} width={gif.width} height={gif.height} unoptimized /><span>{gif.label}</span><i>GIF</i></button>)}</div>}
                  <div className="gif-source-heading built-in"><strong>Whisper GIFs</strong><span>always available</span></div>
                  <div className="gif-grid">{gifs.filter((gif) => gif.label.toLowerCase().includes(gifQuery.toLowerCase())).map((gif) => <button key={gif.id} onClick={() => sendGif(gif)} className={`gif-card gif-${gif.id}`} style={{ "--gif-a": gif.colors[0], "--gif-b": gif.colors[1] } as CSSProperties}><span>{gif.emoji}</span><strong>{gif.label}</strong><i>GIF</i></button>)}</div>
                </>
              )}
            </div>
          )}
          <form className="composer" onSubmit={sendMessage}>
            <button type="button" className="composer-button" aria-label="Attach file" onClick={() => flash("Choose a photo, file, or location")}>⌇</button>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" aria-label="Message" />
            <button type="button" className={`composer-button ${showMediaPicker ? "active" : ""}`} aria-label="Add emoji or GIF" onClick={() => setShowMediaPicker((value) => !value)}>☺</button>
            <button type={draft.trim() ? "submit" : "button"} className={`send-button ${draft.trim() ? "ready" : ""}`} aria-label={draft.trim() ? "Send message" : "Record voice message"} onClick={() => !draft.trim() && flash("Hold to record a voice message")}>
              {draft.trim() ? "➤" : "♩"}
            </button>
          </form>
          <p className="composer-hint">Enter to send · <span>encrypted on this device</span></p>
        </div>
      </section>

      {showInfo && (
        <aside className="info-panel" aria-label="Conversation details">
          <button className="close-info" onClick={() => setShowInfo(false)} aria-label="Close details">×</button>
          <span className={`avatar info-avatar avatar-${activeChat.color}`}>{activeChat.initials}</span>
          <h2>{activeChat.name}</h2>
          <p className="info-status">{activeChat.online ? "online" : "last seen recently"}</p>
          <div className="quick-actions">
            <button onClick={() => flash("Notifications muted")}><span>♩</span>Mute</button>
            <button onClick={() => flash("Secure call started")}><span>♢</span>Call</button>
            <button onClick={() => flash("Chat search opened")}><span>⌕</span>Search</button>
          </div>
          <div className="info-card">
            <div><span>Encryption</span><strong>Verified</strong></div>
            <p>Messages and calls are secured with keys stored on your devices.</p>
            <button onClick={() => flash("Safety number copied")}>View safety number</button>
          </div>
          <div className="media-row"><strong>Shared media</strong><button onClick={() => flash("All shared media")}>View all</button></div>
          <div className="media-grid"><span>Lisbon</span><span>Notes</span><span>4 files</span></div>
        </aside>
      )}

      {showNewChat && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowNewChat(false)}>
          <section className="new-chat-modal" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
            <button className="modal-close" onClick={() => setShowNewChat(false)} aria-label="Close new conversation">×</button>
            <span className="modal-icon">⌁</span>
            <h2 id="new-chat-title">New private conversation</h2>
            <p>Create an encrypted space. Only ciphertext is stored on the server.</p>
            <form onSubmit={createConversation}>
              <label htmlFor="new-chat-name">Conversation name</label>
              <input id="new-chat-name" maxLength={80} value={newChatName} onChange={(event) => setNewChatName(event.target.value)} placeholder="e.g. Project Atlas" />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowNewChat(false)}>Cancel</button>
                <button className="primary" type="submit" disabled={!newChatName.trim() || creatingChat}>{creatingChat ? "Creating…" : "Create chat"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
