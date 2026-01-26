"use client";

import { STORAGE_KEY } from "@/app/constants";
import { generateUsername } from "@/app/helpers";
import { useEffect, useState } from "react";

export const useUsername = () => {
 const [username, setUsername] = useState<string>("");

 const storeUser = () => {
  const storedUsername = localStorage.getItem(STORAGE_KEY);
  if (storedUsername) {
   setUsername(storedUsername);
   return;
  }
  const generatedUsername = generateUsername();
  localStorage.setItem(STORAGE_KEY, generatedUsername);
  setUsername(generatedUsername);
 };

 useEffect(() => {
  storeUser();
 }, []);

 return { username };
};
