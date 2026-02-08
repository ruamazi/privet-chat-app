import CryptoJS from "crypto-js";

export class E2EE {
 private static readonly STORAGE_KEY = "private_chat_keys";

 static generateKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
 }

 static storeKey(roomId: string, key: string): void {
  const keys = this.getStoredKeys();
  keys[roomId] = key;
  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
 }

 static getStoredKeys(): Record<string, string> {
  try {
   const stored = localStorage.getItem(this.STORAGE_KEY);
   return stored ? JSON.parse(stored) : {};
  } catch {
   return {};
  }
 }

 static getKey(roomId: string): string | null {
  const keys = this.getStoredKeys();
  return keys[roomId] || null;
 }

 static encrypt(text: string, key: string): string {
  return CryptoJS.AES.encrypt(text, key).toString();
 }

  static decrypt(ciphertext: string, key: string): string {
   try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption results in empty string, it likely failed
    if (!decrypted || decrypted.length === 0) {
     throw new Error("Decryption returned empty string");
    }
    return decrypted;
   } catch (error) {
    console.error("Decryption error:", error);
    throw error;
   }
  }

 static generateRoomKey(): { key: string; hash: string } {
  const key = this.generateKey();
  const hash = CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex).slice(0, 16);
  return { key, hash };
 }

 static hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
 }
}
