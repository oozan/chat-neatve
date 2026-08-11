"use client";

import { FormEvent, useMemo, useState } from "react";

type Message = {
  id: number;
  text: string;
  time: string;
  mine?: boolean;
  status?: "read" | "sent";
  replyTo?: string;
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

export function ChatApp() {
  const [chats, setChats] = useState(initialChats);
  const [activeId, setActiveId] = useState("maya");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeChat = chats.find((chat) => chat.id === activeId) ?? chats[0];
  const visibleChats = useMemo(
    () => chats.filter((chat) => chat.name.toLowerCase().includes(query.toLowerCase())),
    [chats, query],
  );

  function selectChat(id: string) {
    setActiveId(id);
    setMobileChatOpen(true);
    setShowInfo(false);
    setChats((current) => current.map((chat) => (chat.id === id ? { ...chat, unread: 0 } : chat)));
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const message: Message = {
      id: Date.now(),
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
    setShowEmoji(false);
    window.setTimeout(() => {
      setChats((current) =>
        current.map((chat) =>
          chat.id === activeChat.id
            ? { ...chat, messages: chat.messages.map((item) => (item.id === message.id ? { ...item, status: "read" } : item)) }
            : chat,
        ),
      );
    }, 700);
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
            <span><i className="status-dot" /> encrypted</span>
          </div>
          <button className="icon-button new-chat" aria-label="Start new chat" onClick={() => flash("New conversation")}>＋</button>
        </header>

        <div className="search-wrap">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search conversations" />
          <kbd>⌘ K</kbd>
        </div>

        <nav className="filter-tabs" aria-label="Conversation filters">
          <button className="active">All <span>7</span></button>
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

        <div className="message-space">
          <div className="day-divider"><span>Today</span></div>
          <div className="messages" aria-live="polite">
            {activeChat.messages.map((message) => (
              <div key={message.id} className={`message-row ${message.mine ? "mine" : "theirs"}`}>
                {!message.mine && <span className={`mini-avatar avatar-${activeChat.color}`}>{activeChat.initials}</span>}
                <div className="bubble">
                  {message.replyTo && <div className="reply-quote">{message.replyTo}</div>}
                  <p>{message.text}</p>
                  <span className="message-meta">
                    {message.time}
                    {message.mine && <b aria-label={message.status === "read" ? "Read" : "Sent"}>{message.status === "read" ? "✓✓" : "✓"}</b>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="composer-zone">
          {showEmoji && (
            <div className="emoji-picker" aria-label="Emoji picker">
              {["✨", "❤️", "😂", "👍", "🔥", "☀️", "🎉", "👋"].map((emoji) => (
                <button key={emoji} onClick={() => setDraft((value) => value + emoji)}>{emoji}</button>
              ))}
            </div>
          )}
          <form className="composer" onSubmit={sendMessage}>
            <button type="button" className="composer-button" aria-label="Attach file" onClick={() => flash("Choose a photo, file, or location")}>⌇</button>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message…" aria-label="Message" />
            <button type="button" className="composer-button" aria-label="Add emoji" onClick={() => setShowEmoji((value) => !value)}>☺</button>
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

      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
