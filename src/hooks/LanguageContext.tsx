"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "../dictionaries/en";
import { es } from "../dictionaries/es";
import { ru } from "../dictionaries/ru";
import { th } from "../dictionaries/th";

type LanguageType = "en" | "es" | "ru" | "th";
const translations = { en, es, ru, th };

interface Dictionary {
 home: Record<string, string>;
 room: Record<string, string>;
}

interface LanguageContextProps {
 language: LanguageType;
 t: Dictionary;
 setLanguage: (lang: LanguageType) => void;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(
 undefined,
);

export const LanguageProvider = ({
 children,
}: {
 children: React.ReactNode;
}) => {
 const [language, setLanguage] = useState<LanguageType>("en");
 // Persistence: Check localStorage on load so it remembers the user's choice
 useEffect(() => {
  const savedLang = localStorage.getItem("preferredLanguage") as LanguageType;
  if (savedLang && translations[savedLang]) {
   setLanguage(savedLang);
  }
 }, []);

 const handleSetLanguage = (lang: LanguageType) => {
  setLanguage(lang);
  localStorage.setItem("preferredLanguage", lang);
 };

 return (
  <LanguageContext.Provider
   value={{
    language,
    t: translations[language] as Dictionary,
    setLanguage: handleSetLanguage,
   }}
  >
   {children}
  </LanguageContext.Provider>
 );
};

export const useLanguage = () => {
 const context = useContext(LanguageContext);
 if (!context)
  throw new Error("useLanguage must be used within a LanguageProvider");
 return context;
};
