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
