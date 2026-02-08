import { nanoid } from "nanoid";
import { WORDS } from "./constants";

export const generateUsername = () => {
 const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
 const username = randomWord.toLocaleUpperCase() + "_" + nanoid(6);
 return username;
};

export function formatTimeRemaining(seconds: number) {
 const mins = Math.floor(seconds / 60);
 const secs = seconds % 60;
 return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number, decimals = 2) {
 if (bytes === 0) return "0 Bytes";
 const k = 1024;
 const dm = decimals < 0 ? 0 : decimals;
 const sizes = ["Bytes", "KB", "MB", "GB"];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function debounce<T extends (...args: unknown[]) => unknown>(
 func: T,
 wait: number
): (...args: Parameters<T>) => void {
 let timeout: NodeJS.Timeout | null = null;
 return (...args: Parameters<T>) => {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => func(...args), wait);
 };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
 func: T,
 limit: number
): (...args: Parameters<T>) => void {
 let inThrottle = false;
 return (...args: Parameters<T>) => {
  if (!inThrottle) {
   func(...args);
   inThrottle = true;
   setTimeout(() => (inThrottle = false), limit);
  }
 };
}
