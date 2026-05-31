export interface ScriptEntry {
  text: string;
  emotion: string; // 'suspenseful' | 'joyous' | 'sorrowful' | 'angry' | 'excited' | 'serene' | 'terrified' | 'astonished' | 'romantic' | 'neutral'
  instruction: string; // tone guide, e.g., 'Whisper in hushed terror'
  audioUrl?: string; // Loaded standard WAV blob ObjectURL
  duration?: number; // length in seconds if compiled
  audioLoaded?: boolean;
}

export interface StoryPreset {
  id: string;
  title: string;
  author: string;
  description: string;
  genre: "Gothic Horror" | "Classic Fairy Tale" | "Wonder & Adventure" | "Custom Upload";
  coverColor: string; // Tailwind bg color class
  text: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  voiceName: "Kore" | "Fenrir" | "Zephyr" | "Puck" | "Charon";
  gender: "Female" | "Male";
  vibe: string;
  description: string;
  emotionSupport: string;
  vocalModifier?: string; // e.g. "Speak with a soft, breathing chuckle" or "Whispering quietly"
}

export interface User {
  id: string;
  email: string;
  status: "unverified" | "active";
  mfaEnabled: boolean;
  passkeyRegistered: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}
