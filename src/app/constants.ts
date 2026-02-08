export const WORDS = [
 "apple",
 "banana",
 "cherry",
 "date",
 "elderberry",
 "fig",
 "grape",
 "honeydew",
 "kiwi",
 "lemon",
 "mango",
 "nectarine",
 "orange",
 "papaya",
 "quince",
 "raspberry",
 "strawberry",
 "tangerine",
 "ugli",
 "violet",
 "watermelon",
 "xigua",
 "yellowberry",
 "zucchini",
];

export const STORAGE_KEY = "private_chat_username";
export const ENCRYPTION_KEY = "private_chat_encryption_keys";

// Room expiration options in seconds
export const ROOM_TTL_OPTIONS = [
 { value: 300, label: "5 minutes" },
 { value: 600, label: "10 minutes" },
 { value: 1800, label: "30 minutes" },
 { value: 3600, label: "1 hour" },
 { value: 7200, label: "2 hours" },
 { value: 86400, label: "24 hours" },
];

export const DEFAULT_ROOM_TTL_SECONDS = 600; // 10 minutes

// Rate limiting configuration
export const RATE_LIMIT = {
 MESSAGES_PER_MINUTE: 15,
 ROOM_CREATION_PER_HOUR: 10,
 IP_REQUESTS_PER_MINUTE: 50,
};

// Message editing/deletion time limit (in milliseconds)
export const MESSAGE_EDIT_DELETE_LIMIT = 5 * 60 * 1000; // 5 minutes

// Typing indicator timeout (in milliseconds)
export const TYPING_TIMEOUT = 3000;

// Audio configuration
export const NOTIFICATION_SOUND_URL = "/notification.wav";

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
 SEND_MESSAGE: "Enter",
 NEW_LINE: "Shift+Enter",
 CANCEL_EDIT: "Escape",
 FOCUS_INPUT: "/",
};

// Emoji categories for the picker
export const EMOJI_CATEGORIES = [
 "smileys_people",
 "animals_nature",
 "food_drink",
 "activities",
 "travel_places",
 "objects",
 "symbols",
 "flags",
];
