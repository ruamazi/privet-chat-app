"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useMutation, useQuery } from "@tanstack/react-query";
import { client } from "../../lib/client";
import { formatTimeRemaining } from "../../helpers";
import { useUsername } from "@/hooks/use-username";
import { useRealtime } from "@/app/lib/realtime-client";
import { useLanguage } from "@/hooks/LanguageContext";
import { E2EE } from "@/lib/e2ee";
import ReactMarkdown from "react-markdown";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import QRCode from "qrcode";

interface Message {
 id: string;
 sender: string;
 text: string;
 timestamp: number;
 roomId: string;
 encrypted?: boolean;
 reactions?: Record<string, string[]>;
 readBy?: string[];
 edited?: boolean;
 editedAt?: number;
 deleted?: boolean;
 isOwn?: boolean;
}

const RoomPage = () => {
 const [input, setInput] = useState("");
 const [copyStatus, setCopyStatus] = useState("COPY");
 const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
 const [isTyping, setIsTyping] = useState(false);
 const [typingUsers, setTypingUsers] = useState<string[]>([]);
 const [soundEnabled, setSoundEnabled] = useState(true);
 const [notificationsEnabled, setNotificationsEnabled] = useState(false);
 const [showEmojiPicker, setShowEmojiPicker] = useState(false);
 const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
 const [editingMessage, setEditingMessage] = useState<Message | null>(null);
 const [showQRCode, setShowQRCode] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [encryptionKeyAvailable, setEncryptionKeyAvailable] = useState(false);
 
  const inputRef = useRef<HTMLInputElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const audioRef = useRef<HTMLAudioElement | null>(null);
 const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 
 const params = useParams();
 const roomId = params.roomId as string;
 const router = useRouter();

 const { username } = useUsername();
 const { t } = useLanguage();

 // Initialize audio
 useEffect(() => {
  audioRef.current = new Audio("/notification.wav");
 }, []);

 // Check for encryption key in URL hash
 useEffect(() => {
  const extractKey = () => {
   const hash = window.location.hash;
   if (hash && hash.startsWith("#key=")) {
    const key = hash.substring(5);
    if (key && key.length > 0) {
     E2EE.storeKey(roomId, key);
     setEncryptionKeyAvailable(true);
     // Clear the hash from URL for security
     window.history.replaceState(null, "", window.location.pathname + window.location.search);
     // Force re-fetch messages with new key
     refetch();
    }
   } else if (E2EE.getKey(roomId)) {
    setEncryptionKeyAvailable(true);
   }
  };
  
  // Extract key immediately and also after a short delay (for mobile browsers)
  extractKey();
  const timer = setTimeout(extractKey, 100);
  
  return () => clearTimeout(timer);
 }, [roomId, refetch]);

 // Request notification permission
 useEffect(() => {
  const checkNotificationPermission = () => {
   if ("Notification" in window && Notification.permission === "granted") {
    return true;
   }
   return false;
  };
  
  const hasPermission = checkNotificationPermission();
  if (hasPermission) {
   setNotificationsEnabled(true);
  }
 }, []);

 // Generate QR code
 useEffect(() => {
  const generateQR = async () => {
   const url = `${window.location.origin}/room/${roomId}`;
   const qrDataUrl = await QRCode.toDataURL(url, { width: 150 });
   setQrCodeUrl(qrDataUrl);
  };
  generateQR();
 }, [roomId]);

 const copyLink = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
  setCopyStatus("COPIED");
  setTimeout(() => {
   setCopyStatus("COPY");
  }, 2000);
 };

 const playNotificationSound = useCallback(() => {
  if (soundEnabled && audioRef.current) {
   audioRef.current.play().catch(() => {
    // Audio play failed (possibly due to browser autoplay policy)
   });
  }
 }, [soundEnabled]);

 const sendNotification = useCallback((title: string, body: string) => {
  if (notificationsEnabled && "Notification" in window && document.hidden) {
   new Notification(title, { body, icon: "/favicon.ico" });
  }
 }, [notificationsEnabled]);

 const enableNotifications = async () => {
  if ("Notification" in window) {
   const permission = await Notification.requestPermission();
   if (permission === "granted") {
    setNotificationsEnabled(true);
   }
  }
 };

 const { mutate: sendMessage, isPending: sendingMessage } = useMutation({
  mutationFn: async ({ text, encrypted }: { text: string; encrypted: boolean }) => {
   await client.messages.post(
    { sender: username, text, encrypted },
    { query: { roomId } },
   );
   setInput("");
   setEditingMessage(null);
  },
  onError: (err) => {
   setError(err instanceof Error ? err.message : "Failed to send message");
  },
 });

 const { mutate: editMessage, isPending: editing } = useMutation({
  mutationFn: async ({ messageId, text }: { messageId: string; text: string }) => {
   await client.messages({ messageId }).put({ text }, { query: { roomId } });
  },
  onSuccess: () => {
   setEditingMessage(null);
   refetch();
  },
  onError: (err) => {
   setError(err instanceof Error ? err.message : "Failed to edit message");
  },
 });

 const { mutate: deleteMessage } = useMutation({
  mutationFn: async (messageId: string) => {
   await client.messages({ messageId }).delete(null, { query: { roomId } });
  },
  onSuccess: () => {
   refetch();
  },
  onError: (err) => {
   setError(err instanceof Error ? err.message : "Failed to delete message");
  },
 });

 const { mutate: addReaction } = useMutation({
  mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
   await client.messages({ messageId })["reactions"].post({ emoji }, { query: { roomId } });
  },
 });

 const { mutate: markAsRead } = useMutation({
  mutationFn: async (messageId: string) => {
   await client.messages({ messageId })["read"].post(null, { query: { roomId } });
  },
 });

 const { mutate: sendTyping, isPending: sendingTyping } = useMutation({
  mutationFn: async (typing: boolean) => {
   await client.typing.post({ isTyping: typing }, { query: { roomId } });
  },
 });

 const { mutate: destroyRoom } = useMutation({
   mutationFn: async () => {
    await client.room.delete(null, { query: { roomId } });
   },
   onSuccess: () => {
    router.push("/?destroyed=true");
   },
  });

 const { data: messages, refetch } = useQuery({
  queryKey: ["messages", roomId, encryptionKeyAvailable],
  queryFn: async () => {
   const resp = await client.messages.get({ query: { roomId } });
   return resp.data;
  },
 });

 const { data: typingData, refetch: refetchTyping } = useQuery({
  queryKey: ["typing", roomId],
  queryFn: async () => {
   const resp = await client.typing.get({ query: { roomId } });
   return resp.data;
  },
  refetchInterval: 3000,
 });

 useEffect(() => {
  if (typingData?.activeUsers) {
   setTypingUsers(typingData.activeUsers.filter((u: string) => u !== username));
  }
 }, [typingData, username]);

 useRealtime({
  channels: [roomId],
  events: ["chat.message", "chat.destroy", "chat.messageEdited", "chat.messageDeleted", "chat.reaction", "chat.readReceipt", "chat.typing"],
   onData: ({ event, data }) => {
    if (event === "chat.message") {
     refetch();
     // Only play sound and send notification for messages from OTHER users
     if (data.sender !== username) {
      playNotificationSound();
      sendNotification("New Message", `${data.sender}: ${data.text}`);
     }
     // Mark as read
     setTimeout(() => markAsRead(data.id), 500);
    }
   if (event === "chat.destroy") {
    router.push("/?destroyed=true");
   }
   if (event === "chat.messageEdited" || event === "chat.messageDeleted" || event === "chat.reaction") {
    refetch();
   }
   if (event === "chat.readReceipt") {
    refetch();
   }
   if (event === "chat.typing") {
    refetchTyping();
   }
  },
 });

 const { data: ttlData } = useQuery({
  queryKey: ["ttl", roomId],
  queryFn: async () => {
   const resp = await client.room.ttl.get({ query: { roomId } });
   return resp.data;
  },
 });

 useEffect(() => {
  if (ttlData?.ttl !== undefined) {
   const ttl = ttlData.ttl;
   setTimeRemaining(ttl);
   // If TTL is already 0 or less, destroy room immediately
   if (ttl <= 0) {
    destroyRoom();
   }
  }
  setLoading(false);
 }, [ttlData, destroyRoom]);

 useEffect(() => {
  if (timeRemaining === null) return;
  
  // When timer reaches 0, destroy the room
  if (timeRemaining === 0) {
   destroyRoom();
   return;
  }
  
  const interval = setInterval(() => {
   setTimeRemaining((prev) => {
    if (prev === null || prev <= 1) {
     clearInterval(interval);
     return 0;
    }
    return prev - 1;
   });
  }, 1000);
  return () => clearInterval(interval);
 }, [timeRemaining, destroyRoom, router]);

 // Scroll to bottom on new messages
 useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
 }, [messages]);

 // Handle typing indicator
 const handleInputChange = (value: string) => {
  setInput(value);
  
  if (!isTyping) {
   setIsTyping(true);
   sendTyping(true);
  }

  // Clear existing timeout
  if (typingTimeoutRef.current) {
   clearTimeout(typingTimeoutRef.current);
  }

  // Set new timeout
  typingTimeoutRef.current = setTimeout(() => {
   setIsTyping(false);
   sendTyping(false);
  }, 3000);
 };

 const handleEmojiClick = (emojiData: EmojiClickData) => {
  setInput((prev) => prev + emojiData.emoji);
  setShowEmojiPicker(false);
  inputRef.current?.focus();
 };

 const handleEditMessage = (msg: Message) => {
  setEditingMessage(msg);
  setInput(msg.text);
  inputRef.current?.focus();
 };

 const handleCancelEdit = () => {
  setEditingMessage(null);
  setInput("");
 };

 const handleSend = () => {
  if (!input.trim()) return;

  if (editingMessage) {
   editMessage({ messageId: editingMessage.id, text: input });
  } else {
   const encryptionKey = E2EE.getKey(roomId);
   let text = input;
   let encrypted = false;
   
   if (encryptionKey) {
    text = E2EE.encrypt(input, encryptionKey);
    encrypted = true;
   }
   
   sendMessage({ text, encrypted });
  }
 };

  const decryptMessage = (msg: Message): string => {
   if (msg.encrypted) {
    const key = E2EE.getKey(roomId);
    if (key) {
     try {
      const decrypted = E2EE.decrypt(msg.text, key);
      return decrypted;
     } catch (error) {
      console.error("Failed to decrypt message:", error, "Message ID:", msg.id);
      return "[Unable to decrypt - key may be incorrect]";
     }
    }
    return "[Encrypted message - waiting for key]";
   }
   return msg.text;
  };

 if (loading) {
  return (
   <main className="flex flex-col h-screen max-h-screen overflow-hidden items-center justify-center">
    <div className="text-green-500 animate-pulse">Loading...</div>
   </main>
  );
 }

 return (
  <main 
   className="flex flex-col h-screen max-h-screen overflow-hidden"
   role="main"
   aria-label="Chat room"
  >
   <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
    <div className="flex items-center gap-4">
     <div className="flex flex-col">
      <span className="text-xs text-zinc-500 uppercase">{t.room.room_id}</span>
      <div className="flex items-center gap-2">
       <span className="font-bold text-green-500 truncate">
        {roomId.slice(0, 10) + "..."}
       </span>
       <button
        onClick={copyLink}
        className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
        aria-label="Copy room link"
       >
        {copyStatus}
       </button>
       {qrCodeUrl && (
        <button
         onClick={() => setShowQRCode(!showQRCode)}
         className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
         aria-label="Toggle QR code"
        >
         QR
        </button>
       )}
      </div>
     </div>

     <div className="h-8 w-px bg-zinc-800" />

     <div className="flex flex-col">
      <span className="text-xs text-zinc-500 uppercase">
       {t.room.self_destruct}
      </span>
      <span
       className={`text-sm font-bold flex items-center gap-2 ${
        timeRemaining !== null && timeRemaining < 60
         ? "text-red-500"
         : "text-amber-500"
       }`}
       aria-live="polite"
      >
       {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
      </span>
     </div>
    </div>

    <div className="flex items-center gap-2">
     {/* Sound toggle */}
     <button
      onClick={() => setSoundEnabled(!soundEnabled)}
      className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 font-bold transition-all"
      aria-label={soundEnabled ? "Mute notifications" : "Enable notification sounds"}
      title={soundEnabled ? t.room.sound_on : t.room.sound_off}
     >
      {soundEnabled ? "🔊" : "🔇"}
     </button>

     {/* Notifications toggle */}
     {!notificationsEnabled && (
      <button
       onClick={enableNotifications}
       className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 font-bold transition-all"
       aria-label="Enable push notifications"
       title={t.room.enable_notifications}
      >
       🔔
      </button>
     )}

     <button
      onClick={() => destroyRoom()}
      className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50"
      aria-label="Destroy room and all messages"
     >
      <span className="group-hover:animate-pulse text-lg">💣</span>
      {t.room.destroy_now}
     </button>
    </div>
   </header>

   {/* QR Code Popup */}
   {showQRCode && qrCodeUrl && (
    <div className="absolute top-16 right-4 z-10 bg-zinc-900 border border-zinc-800 p-4 rounded shadow-lg">
     <img src={qrCodeUrl} alt="Room QR Code" className="w-32 h-32" />
     <p className="text-xs text-zinc-500 text-center mt-2">Scan to join</p>
    </div>
   )}

   {/* Error Message */}
   {error && (
    <div 
     className="bg-red-950/50 border border-red-900 p-3 mx-4 mt-4 text-red-500 text-sm"
     role="alert"
    >
     {error}
     <button 
      onClick={() => setError(null)} 
      className="float-right text-red-400 hover:text-red-300"
      aria-label="Dismiss error"
     >
      ✕
     </button>
    </div>
   )}

   {/* Typing Indicator */}
   {typingUsers.length > 0 && (
    <div className="px-4 py-2 text-xs text-zinc-500 italic" aria-live="polite">
     {typingUsers.length === 1
      ? `${t.room.typing}`
      : `${typingUsers.length} ${t.room.others_typing}`}
    </div>
   )}

   {/* MESSAGES */}
   <div 
    className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
    role="log"
    aria-label="Chat messages"
    aria-live="polite"
   >
    {messages?.messages.length === 0 && (
     <div className="flex items-center justify-center h-full">
      <p className="text-zinc-600 text-sm font-mono">{t.room.no_messages}</p>
     </div>
    )}

    {messages?.messages.map((msg: Message) => (
     <div 
      key={msg.id} 
      className="flex flex-col items-start"
      role="article"
      aria-label={`Message from ${msg.sender === username ? 'you' : msg.sender}`}
     >
      <div className="max-w-[80%] group relative">
       <div className="flex items-baseline gap-3 mb-1">
        <span
         className={`text-xs font-bold ${
          msg.sender === username ? "text-green-500" : "text-blue-500"
         }`}
        >
         {msg.sender === username ? "YOU" : msg.sender}
        </span>

        <span className="text-[10px] text-zinc-600">
         {format(msg.timestamp, "HH:mm")}
        </span>

        {msg.edited && (
         <span className="text-[10px] text-zinc-600">{t.room.edited}</span>
        )}

        {/* Read receipt indicator */}
        {msg.isOwn && msg.readBy && msg.readBy.length > 1 && (
         <span className="text-[10px] text-blue-500" title={t.room.read}>✓✓</span>
        )}
        {msg.isOwn && (!msg.readBy || msg.readBy.length <= 1) && (
         <span className="text-[10px] text-zinc-600" title={t.room.unread}>✓</span>
        )}
       </div>

       <div className="text-sm text-zinc-300 leading-relaxed break-all">
        {msg.deleted ? (
         <span className="italic text-zinc-600">{t.room.deleted}</span>
        ) : (
         <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>
           {decryptMessage(msg)}
          </ReactMarkdown>
         </div>
        )}
       </div>

       {/* Reactions */}
       {msg.reactions && Object.keys(msg.reactions).length > 0 && (
        <div className="flex gap-1 mt-1">
         {Object.entries(msg.reactions).map(([emoji, users]) => (
          <button
           key={emoji}
           onClick={() => addReaction({ messageId: msg.id, emoji })}
           className="text-xs bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
           aria-label={`${emoji} reaction, ${users.length} users`}
          >
           {emoji} {users.length}
          </button>
         ))}
        </div>
       )}

       {/* Message Actions */}
       {msg.isOwn && !msg.deleted && (
        <div className="absolute -right-16 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
         <button
          onClick={() => handleEditMessage(msg)}
          className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400 hover:text-zinc-200"
          aria-label="Edit message"
         >
          {t.room.edit}
         </button>
         <button
          onClick={() => deleteMessage(msg.id)}
          className="text-[10px] bg-zinc-800 hover:bg-red-600 px-2 py-1 rounded text-zinc-400 hover:text-white"
          aria-label="Delete message"
         >
          {t.room.delete}
         </button>
        </div>
       )}

       {/* Add Reaction Button */}
       {!msg.deleted && (
        <button
         onClick={() => addReaction({ messageId: msg.id, emoji: "👍" })}
         className="absolute -left-6 top-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
         aria-label="Add thumbs up reaction"
        >
         👍
        </button>
       )}
      </div>
     </div>
    ))}
    <div ref={messagesEndRef} />
   </div>

   {/* Message Input */}
   <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
    {editingMessage && (
     <div className="flex items-center justify-between mb-2 text-xs text-zinc-500">
      <span>Editing message...</span>
      <button 
       onClick={handleCancelEdit}
       className="text-zinc-400 hover:text-zinc-200"
       aria-label="Cancel editing"
      >
       Cancel
      </button>
     </div>
    )}
    
    <div className="flex gap-4">
     <div className="flex-1 relative group">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
       {">"}
      </span>
      
      {/* Emoji Picker */}
      {showEmojiPicker && (
       <div className="absolute bottom-full left-0 mb-2 z-20">
        <EmojiPicker
         onEmojiClick={handleEmojiClick}
         theme={Theme.DARK}
         width={300}
         height={400}
        />
       </div>
      )}
      
      <input
       ref={inputRef}
       autoFocus
       type="text"
       value={input}
       onKeyDown={(e) => {
        if (e.key === "Enter" && input.trim()) {
         handleSend();
        }
        if (e.key === "Escape" && editingMessage) {
         handleCancelEdit();
        }
       }}
       placeholder={editingMessage ? "Edit message..." : t.room.input_plch}
       onChange={(e) => handleInputChange(e.target.value)}
       className="w-full bg-black border border-zinc-800 focus:border-zinc-700 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-12 text-sm"
       aria-label={editingMessage ? "Edit message" : "Type a message"}
      />
      
      {/* Emoji Button */}
      <button
       onClick={() => setShowEmojiPicker(!showEmojiPicker)}
       className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
       aria-label="Open emoji picker"
       title="Add emoji"
      >
       😊
      </button>
     </div>

     <button
      onClick={handleSend}
      disabled={!input.trim() || sendingMessage || editing}
      className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      aria-label={editingMessage ? "Save edited message" : "Send message"}
     >
      {editingMessage ? "SAVE" : t.room.send_text}
     </button>
    </div>
   </div>
  </main>
 );
};

export default RoomPage;
