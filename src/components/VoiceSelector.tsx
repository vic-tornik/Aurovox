import React, { useState } from "react";
import { VOICE_PROFILES } from "../data";
import { VoiceProfile } from "../types";
import { Volume2, Music, Sparkles, Check, Play, Square, Loader2 } from "lucide-react";

interface VoiceSelectorProps {
  selectedVoice: VoiceProfile;
  onSelectVoice: (voice: VoiceProfile) => void;
  isEmotionalDynamic: boolean;
  onToggleEmotionalDynamic: (enabled: boolean) => void;
}

export default function VoiceSelector({
  selectedVoice,
  onSelectVoice,
  isEmotionalDynamic,
  onToggleEmotionalDynamic,
}: VoiceSelectorProps) {
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  const testVoiceSample = async (voice: VoiceProfile) => {
    // Stop any currently playing samples
    if (activeAudio) {
      activeAudio.pause();
      setActiveAudio(null);
    }

    if (playingSampleId === voice.id) {
      setPlayingSampleId(null);
      return;
    }

    try {
      setLoadingSampleId(voice.id);
      
      const sampleText = `Hello! I am ${voice.name}, your narrator. I will read your book with rich human expressions, breathing life into every character's emotions.`;
      const genericTone = voice.voiceName === "Kore" ? "Say warmly and gently"
                        : voice.voiceName === "Zephyr" ? "Say cheerfully with high energy"
                        : voice.voiceName === "Charon" ? "Narrate dramatically and deeply"
                        : voice.voiceName === "Fenrir" ? "Whisper intensely in suspenseful tones"
                        : "Say with rapid, friendly excitement";

      const response = await fetch("/api/generate-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sampleText,
          voiceName: voice.voiceName,
          instruction: genericTone,
          vocalModifier: voice.vocalModifier,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to synthesize voice preview");
      }

      const { wavBase64 } = await response.json();
      const audioUrl = `data:audio/wav;base64,${wavBase64}`;
      const audio = new Audio(audioUrl);
      
      setActiveAudio(audio);
      setPlayingSampleId(voice.id);
      setLoadingSampleId(null);
      
      audio.play();

      audio.onended = () => {
        setPlayingSampleId(null);
        setActiveAudio(null);
      };
    } catch (e) {
      console.error(e);
      setLoadingSampleId(null);
      setPlayingSampleId(null);
      alert("Could not load preview sample. Please verify your GEMINI_API_KEY in secrets.");
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-6 shadow-2xl space-y-6" id="voice-selector-container">
      {/* Configuration Header */}
      <div>
        <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-cyan-500" />
          Choose Audiobook Voices
        </h3>
        <p className="text-xs text-neutral-400 mt-1">
          Select from premium human-like voice structures configured for multi-genre novels.
        </p>
      </div>

      {/* Voice Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {VOICE_PROFILES.map((voice) => {
          const isSelected = selectedVoice.id === voice.id;
          const isPlaying = playingSampleId === voice.id;
          const isLoading = loadingSampleId === voice.id;

          return (
            <div
              key={voice.id}
              className={`relative flex flex-col justify-between rounded-xl p-4 border transition ${
                isSelected
                  ? "bg-neutral-800/60 border-cyan-500 shadow-xl shadow-cyan-550/5"
                  : "bg-neutral-950/20 border-neutral-800/40 hover:bg-neutral-800/20"
              }`}
            >
              {/* Highlight selection bubble */}
              <button
                id={`voice-select-${voice.id}-btn`}
                onClick={() => onSelectVoice(voice)}
                className="absolute inset-0 cursor-pointer z-10"
                aria-label={`Select voice ${voice.name}`}
              />

              {/* Card Meta Content */}
              <div className="relative z-20 pointer-events-none mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                      voice.gender === "Female"
                        ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {voice.gender}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center text-neutral-950">
                      <Check className="w-2.5 h-2.5 stroke-[4px]" />
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-neutral-100">{voice.name}</h4>
                <p className="text-[10px] text-cyan-400/90 font-semibold mt-1 line-clamp-1">{voice.vibe}</p>
                <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed line-clamp-3">
                  {voice.description}
                </p>
                <p className="text-[10px] text-neutral-500 mt-2 border-t border-neutral-800/40 pt-1.5 line-clamp-2">
                  {voice.emotionSupport}
                </p>
              </div>

              {/* Preview Button */}
              <div className="relative z-20 mt-auto pt-2 border-t border-neutral-800/45">
                <button
                  id={`voice-preview-${voice.id}-btn`}
                  onClick={() => testVoiceSample(voice)}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition ${
                    isPlaying
                      ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                      : "bg-neutral-800 border border-neutral-700/50 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-700/60"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                      Loading sample...
                    </>
                  ) : isPlaying ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      Stop sample
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current text-cyan-500" />
                      Listen sample
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Extreme Emotion Toggle */}
      <div className="p-4 bg-neutral-950/60 rounded-xl border border-neutral-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-sm font-bold text-neutral-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Vivid Emotional Acting Mode
          </label>
          <p className="text-xs text-neutral-400">
            Automatically parses chunks for individual emotions (suspense, excitement, sadness) and commands Gemini to dynamically shift voice pitches, speeds, and breathing patterns.
          </p>
        </div>

        <button
          id="toggle-emotional-mode-btn"
          onClick={() => onToggleEmotionalDynamic(!isEmotionalDynamic)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isEmotionalDynamic ? "bg-cyan-500" : "bg-neutral-800"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-neutral-950 shadow ring-0 transition duration-200 ease-in-out ${
              isEmotionalDynamic ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
