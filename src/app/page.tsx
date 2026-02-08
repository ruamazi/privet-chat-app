"use client";

import { Suspense, useState } from "react";

import { useMutation } from "@tanstack/react-query";
import { client } from "./lib/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useUsername } from "@/hooks/use-username";
import { useLanguage } from "@/hooks/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { E2EE } from "@/lib/e2ee";
import QRCode from "qrcode";

const EXPIRATION_OPTIONS = [
 { value: 300, label: "5 minutes" },
 { value: 600, label: "10 minutes" },
 { value: 1800, label: "30 minutes" },
 { value: 3600, label: "1 hour" },
 { value: 7200, label: "2 hours" },
 { value: 86400, label: "24 hours" },
];

const Page = () => {
 return (
  <Suspense>
   <Home />
  </Suspense>
 );
};

function Home() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const wasDestroyed = searchParams.get("destroyed") === "true";
 const error = searchParams.get("error");
 const roomIdFromUrl = searchParams.get("room");
 const authRequired = searchParams.get("auth") === "required";

 const { username } = useUsername();
 const { t } = useLanguage();

 const [expirationTime, setExpirationTime] = useState(600);
 const [password, setPassword] = useState("");
 const [enableEncryption, setEnableEncryption] = useState(true);
 const [showAdvanced, setShowAdvanced] = useState(false);
 const [createdRoom, setCreatedRoom] = useState<{ roomId: string; encryptionKey?: string } | null>(null);
 const [passwordInput, setPasswordInput] = useState("");
 const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

 const { mutate: createRoom, isPending } = useMutation({
  mutationFn: async () => {
   const resp = await client.room.create.post({
    ttlSeconds: expirationTime,
    password: password || undefined,
    enableEncryption,
   });
   return resp.data;
  },
  onSuccess: async (data) => {
   if (data?.encryptionKey) {
    E2EE.storeKey(data.roomId, data.encryptionKey);
   }
   
   // Generate QR code
   const url = `${window.location.origin}/room/${data?.roomId}`;
   const qrDataUrl = await QRCode.toDataURL(url, { width: 200 });
   setQrCodeUrl(qrDataUrl);
   
   setCreatedRoom(data);
  },
   onError: () => {
    // Error handled by mutation
   },
 });

 const { mutate: verifyPassword, isPending: verifyingPassword } = useMutation({
  mutationFn: async () => {
   if (!roomIdFromUrl) return;
   const resp = await client.room["verify-password"].post({
    roomId: roomIdFromUrl,
    password: passwordInput,
   });
   return resp.data;
  },
  onSuccess: (data) => {
   if (data?.valid && roomIdFromUrl) {
    // Set auth cookie and redirect
    document.cookie = `x-room-auth=${E2EE.hashPassword(passwordInput)}; path=/; secure; samesite=strict`;
    router.push(`/room/${roomIdFromUrl}`);
   }
  },
 });

 const handleCreateRoom = () => {
   createRoom();
  };

 const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
 };

 // Password authentication view
 if (authRequired && roomIdFromUrl) {
  return (
   <main className="flex min-h-screen flex-col items-center justify-center p-4">
    <nav className="flex justify-end mb-10">
     <LanguageSwitcher />
    </nav>
    <div className="w-full max-w-md space-y-8">
     <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold tracking-tight text-green-500">
       {">"} {t.home.password_required}
      </h1>
      <p className="text-zinc-500 text-sm">{t.home.enter_password}</p>
     </div>

     <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
      <div className="space-y-5">
       <div className="space-y-2">
        <label className="flex items-center text-zinc-500">{t.home.password}</label>
        <input
         type="password"
         value={passwordInput}
         onChange={(e) => setPasswordInput(e.target.value)}
         onKeyDown={(e) => e.key === "Enter" && verifyPassword()}
         className="w-full bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono focus:border-zinc-700 focus:outline-none"
         placeholder={t.home.password_placeholder}
        />
       </div>

       <button
        onClick={() => verifyPassword()}
        disabled={!passwordInput || verifyingPassword}
        className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
       >
        {verifyingPassword ? t.home.verifying : t.home.join_room}
       </button>
      </div>
     </div>
    </div>
   </main>
  );
 }

 // Room created view
 if (createdRoom) {
   // Include encryption key in URL hash for easy sharing
   const roomUrl = createdRoom.encryptionKey
    ? `${window.location.origin}/room/${createdRoom.roomId}#key=${createdRoom.encryptionKey}`
    : `${window.location.origin}/room/${createdRoom.roomId}`;

  return (
   <main className="flex min-h-screen flex-col items-center justify-center p-4">
    <nav className="flex justify-end mb-10">
     <LanguageSwitcher />
    </nav>
    <div className="w-full max-w-md space-y-8">
     <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold tracking-tight text-green-500">
       {">"} {t.home.room_created}
      </h1>
      <p className="text-zinc-500 text-sm">{t.home.share_link}</p>
     </div>

     <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md space-y-6">
      {/* Room Link */}
      <div className="space-y-2">
       <label className="flex items-center text-zinc-500">{t.home.room_link}</label>
       <div className="flex gap-2">
        <input
         readOnly
         value={roomUrl}
         className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono"
        />
        <button
         onClick={() => copyToClipboard(roomUrl)}
         className="bg-zinc-800 hover:bg-zinc-700 px-4 text-sm font-bold text-zinc-300 transition-colors"
        >
         {t.home.copy}
        </button>
       </div>
      </div>

      {/* Encryption Key */}
      {createdRoom.encryptionKey && (
       <div className="space-y-2">
        <label className="flex items-center text-zinc-500 text-amber-500">
         {t.home.encryption_key}
        </label>
        <div className="flex gap-2">
         <input
          readOnly
          value={createdRoom.encryptionKey}
          className="flex-1 bg-zinc-950 border border-amber-900/50 p-3 text-sm text-amber-400 font-mono"
         />
         <button
          onClick={() => copyToClipboard(createdRoom.encryptionKey!)}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 text-sm font-bold text-zinc-300 transition-colors"
         >
          {t.home.copy}
         </button>
        </div>
        <p className="text-xs text-amber-600/70">{t.home.encryption_warning}</p>
       </div>
      )}

      {/* QR Code */}
      {qrCodeUrl && (
       <div className="flex flex-col items-center space-y-2">
        <label className="text-zinc-500">{t.home.qr_code}</label>
        <img src={qrCodeUrl} alt="Room QR Code" className="w-48 h-48 bg-white p-2 rounded" />
       </div>
      )}

      <button
       onClick={() => router.push(`/room/${createdRoom.roomId}`)}
       className="w-full bg-green-600 hover:bg-green-500 text-white p-3 text-sm font-bold transition-colors mt-4 cursor-pointer"
      >
       {t.home.enter_room}
      </button>
     </div>
    </div>
   </main>
  );
 }

 return (
  <main className="flex min-h-screen flex-col items-center justify-center p-4">
   <nav className="flex justify-end mb-10">
    <LanguageSwitcher />
   </nav>
   <div className="w-full max-w-md space-y-8">
    {wasDestroyed && (
     <div className="bg-red-950/50 border border-red-900 p-4 text-center">
      <p className="text-red-500 text-sm font-bold">{t.home.room_destroyed}</p>
      <p className="text-zinc-500 text-xs mt-1">{t.home.destroyed_error_message}</p>
     </div>
    )}
    {error === "room-not-found" && (
     <div className="bg-red-950/50 border border-red-900 p-4 text-center">
      <p className="text-red-500 text-sm font-bold">{t.home.room_not_found}</p>
      <p className="text-zinc-500 text-xs mt-1">{t.home.not_found_error_message}</p>
     </div>
    )}
    {error === "room-full" && (
     <div className="bg-red-950/50 border border-red-900 p-4 text-center">
      <p className="text-red-500 text-sm font-bold">{t.home.room_full}</p>
      <p className="text-zinc-500 text-xs mt-1">{t.home.full_error_message}</p>
     </div>
    )}
    {error === "rate-limited" && (
     <div className="bg-red-950/50 border border-red-900 p-4 text-center">
      <p className="text-red-500 text-sm font-bold">{t.home.rate_limited}</p>
      <p className="text-zinc-500 text-xs mt-1">{t.home.rate_limited_message}</p>
     </div>
    )}

    <div className="text-center space-y-2">
     <h1 className="text-2xl font-bold tracking-tight text-green-500">
      {">"} {t.home.main_title}
     </h1>
     <p className="text-zinc-500 text-sm">{t.home.sub_title}</p>
    </div>

    <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
     <div className="space-y-5">
      <div className="space-y-2">
       <label className="flex items-center text-zinc-500">{t.home.your_identity}</label>

       <div className="flex items-center gap-3">
        <div className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
         {username}
        </div>
       </div>
      </div>

      {/* Advanced Options Toggle */}
      <button
       onClick={() => setShowAdvanced(!showAdvanced)}
       className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition-colors"
      >
       <span>{showAdvanced ? "▼" : "▶"}</span>
       {t.home.advanced_options}
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
       <div className="space-y-4 border-t border-zinc-800 pt-4">
        {/* Expiration Time */}
        <div className="space-y-2">
         <label className="flex items-center text-zinc-500 text-xs">
          {t.home.expiration_time}
         </label>
         <select
          value={expirationTime}
          onChange={(e) => setExpirationTime(Number(e.target.value))}
          className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm text-zinc-400 focus:border-zinc-700 focus:outline-none"
         >
          {EXPIRATION_OPTIONS.map((option) => (
           <option key={option.value} value={option.value}>
            {option.label}
           </option>
          ))}
         </select>
        </div>

        {/* Password Protection */}
        <div className="space-y-2">
         <label className="flex items-center text-zinc-500 text-xs">
          {t.home.password_optional}
         </label>
         <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 p-2 text-sm text-zinc-400 font-mono focus:border-zinc-700 focus:outline-none"
          placeholder={t.home.password_placeholder}
         />
        </div>

        {/* Encryption Toggle */}
        <div className="flex items-center gap-3">
         <input
          type="checkbox"
          id="encryption"
          checked={enableEncryption}
          onChange={(e) => setEnableEncryption(e.target.checked)}
          className="w-4 h-4 accent-green-500"
         />
         <label htmlFor="encryption" className="text-sm text-zinc-400">
          {t.home.enable_encryption}
         </label>
        </div>
       </div>
      )}

      <button
       onClick={handleCreateRoom}
       disabled={isPending}
       className="w-full bg-zinc-100 text-black p-3 text-sm font-bold hover:bg-zinc-50 hover:text-black transition-colors mt-2 cursor-pointer disabled:opacity-50"
      >
       {isPending ? t.home.creating_room : t.home.create_room}
      </button>
     </div>
    </div>
   </div>
  </main>
 );
}

export default Page;
