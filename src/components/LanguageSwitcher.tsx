"use client";

import { useLanguage } from "@/hooks/LanguageContext";

export default function LanguageSwitcher() {
 const { language, setLanguage } = useLanguage();

 return (
  <div className="relative inline-block text-left">
   <select
    value={language}
    onChange={(e) => setLanguage(e.target.value as "en" | "es" | "ru" | "th")}
    className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md rounded-md px-3 py-1 
    outline-none hover:bg-zinc-800/50 transition text-sm"
   >
    <option value="en">English</option>
    <option value="es">Español</option>
    <option value="ru">Русский</option>
    <option value="th">ไทย</option>
   </select>
  </div>
 );
}
