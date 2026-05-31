import React, { useState, useEffect, useRef } from "react";
import { ScriptEntry, VoiceProfile } from "../types";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Download,
  Share2,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart2,
  Flame,
  Info,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AudiobookPlayerProps {
  script: ScriptEntry[];
  voice: VoiceProfile;
  title: string;
  onReset: () => void;
}

export default function AudiobookPlayer({
  script,
  voice,
  title,
  onReset,
}: AudiobookPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  
  // Cache for loaded audio URLs
  const [audioCache, setAudioCache] = useState<{ [index: number]: string }>({});
  const [fullAudioBlobUrl, setFullAudioBlobUrl] = useState<string | null>(null);
  const [isAssemblingFullBook, setIsAssemblingFullBook] = useState(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const paragraphRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fetchingIndexesRef = useRef<Set<number>>(new Set());

  const emotionEmojis: { [key: string]: string } = {
    suspenseful: "🎭",
    joyous: "🌟",
    sorrowful: "🎻",
    angry: "🔥",
    excited: "✨",
    serene: "🌾",
    terrified: "😱",
    astonished: "😮",
    romantic: "💖",
    neutral: "🎙️",
  };

  const EMOTION_THEMES: { [key: string]: {
    text: string;
    bg: string;
    accent: string;
    primaryBtn: string;
    btnGlow: string;
    progressBar: string;
    discBorder: string;
    grooveBorder: string;
    waveColors: string[];
  }} = {
    suspenseful: {
      text: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      bg: "bg-purple-950/40 border-purple-500/20",
      accent: "text-purple-400",
      primaryBtn: "bg-purple-500 hover:bg-purple-450 text-neutral-950 shadow-lg shadow-purple-500/20",
      btnGlow: "shadow-purple-500/20",
      progressBar: "from-purple-600 to-indigo-500",
      discBorder: "border-purple-500/35",
      grooveBorder: "border-purple-500/40",
      waveColors: [
        "rgba(168, 85, 247, 0.8)",  // purple
        "rgba(139, 92, 246, 0.5)",  // violet
        "rgba(99, 102, 241, 0.3)",  // indigo
        "rgba(168, 85, 247, 0.15)"
      ]
    },
    joyous: {
      text: "text-teal-400 bg-teal-500/10 border-teal-500/20",
      bg: "bg-teal-950/40 border-teal-500/20",
      accent: "text-teal-400",
      primaryBtn: "bg-teal-500 hover:bg-teal-400 text-neutral-950 shadow-lg shadow-teal-500/20",
      btnGlow: "shadow-teal-500/20",
      progressBar: "from-teal-500 to-emerald-400",
      discBorder: "border-teal-500/35",
      grooveBorder: "border-teal-500/40",
      waveColors: [
        "rgba(20, 184, 166, 0.8)",  // teal
        "rgba(14, 165, 233, 0.5)",  // sky
        "rgba(52, 211, 153, 0.3)",  // emerald
        "rgba(20, 184, 166, 0.15)"
      ]
    },
    sorrowful: {
      text: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      bg: "bg-blue-950/40 border-blue-500/20",
      accent: "text-blue-400",
      primaryBtn: "bg-blue-500 hover:bg-blue-450 text-neutral-950 shadow-lg shadow-blue-500/20",
      btnGlow: "shadow-blue-500/20",
      progressBar: "from-blue-600 to-indigo-600",
      discBorder: "border-blue-500/35",
      grooveBorder: "border-blue-500/40",
      waveColors: [
        "rgba(59, 130, 246, 0.8)",  // blue
        "rgba(99, 102, 241, 0.5)",  // indigo
        "rgba(14, 165, 233, 0.3)",  // sky
        "rgba(59, 130, 246, 0.15)"
      ]
    },
    angry: {
      text: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      bg: "bg-rose-950/40 border-rose-500/20",
      accent: "text-rose-400",
      primaryBtn: "bg-rose-500 hover:bg-rose-450 text-neutral-950 shadow-lg shadow-rose-500/20",
      btnGlow: "shadow-rose-500/20",
      progressBar: "from-rose-600 to-red-500",
      discBorder: "border-rose-500/35",
      grooveBorder: "border-rose-500/40",
      waveColors: [
        "rgba(244, 63, 94, 0.8)",   // rose
        "rgba(239, 68, 68, 0.5)",   // red
        "rgba(249, 115, 22, 0.3)",   // orange
        "rgba(244, 63, 94, 0.15)"
      ]
    },
    excited: {
      text: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      bg: "bg-indigo-950/40 border-indigo-500/20",
      accent: "text-indigo-400",
      primaryBtn: "bg-indigo-500 hover:bg-indigo-455 text-neutral-950 shadow-lg shadow-indigo-500/20",
      btnGlow: "shadow-indigo-500/20",
      progressBar: "from-indigo-500 to-purple-500",
      discBorder: "border-indigo-500/35",
      grooveBorder: "border-indigo-500/40",
      waveColors: [
        "rgba(99, 102, 241, 0.8)",  // indigo
        "rgba(168, 85, 247, 0.5)",  // purple
        "rgba(236, 72, 153, 0.3)",  // pink
        "rgba(99, 102, 241, 0.15)"
      ]
    },
    serene: {
      text: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      bg: "bg-cyan-950/40 border-cyan-500/20 border-cyan-500/25",
      accent: "text-cyan-400",
      primaryBtn: "bg-cyan-500 hover:bg-cyan-400 text-neutral-950 shadow-lg shadow-cyan-500/20",
      btnGlow: "shadow-cyan-500/20",
      progressBar: "from-cyan-500 to-teal-400",
      discBorder: "border-cyan-500/35",
      grooveBorder: "border-cyan-500/40",
      waveColors: [
        "rgba(6, 182, 212, 0.8)",   // cyan
        "rgba(20, 184, 166, 0.5)",  // teal
        "rgba(14, 165, 233, 0.3)",  // sky
        "rgba(6, 182, 212, 0.15)"
      ]
    },
    terrified: {
      text: "text-red-400 bg-red-500/10 border-red-500/20",
      bg: "bg-red-950/40 border-red-500/20",
      accent: "text-red-400",
      primaryBtn: "bg-red-600 hover:bg-red-500 text-neutral-950 shadow-lg shadow-red-600/20",
      btnGlow: "shadow-red-600/20",
      progressBar: "from-red-700 to-amber-600",
      discBorder: "border-red-600/35",
      grooveBorder: "border-red-600/40",
      waveColors: [
        "rgba(220, 38, 38, 0.8)",   // red
        "rgba(127, 29, 29, 0.5)",   // dark red
        "rgba(30, 41, 59, 0.3)",    // slate
        "rgba(220, 38, 38, 0.15)"
      ]
    },
    astonished: {
      text: "text-pink-400 bg-pink-500/10 border-pink-500/20",
      bg: "bg-pink-950/40 border-pink-500/20",
      accent: "text-pink-400",
      primaryBtn: "bg-pink-500 hover:bg-pink-400 text-neutral-950 shadow-lg shadow-pink-500/20",
      btnGlow: "shadow-pink-500/20",
      progressBar: "from-pink-500 to-purple-400",
      discBorder: "border-pink-500/35",
      grooveBorder: "border-pink-500/40",
      waveColors: [
        "rgba(236, 72, 153, 0.8)",  // pink
        "rgba(168, 85, 247, 0.5)",  // purple
        "rgba(244, 63, 94, 0.3)",   // rose
        "rgba(236, 72, 153, 0.15)"
      ]
    },
    romantic: {
      text: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
      bg: "bg-fuchsia-950/40 border-fuchsia-500/20",
      accent: "text-fuchsia-400",
      primaryBtn: "bg-fuchsia-500 hover:bg-fuchsia-400 text-neutral-950 shadow-lg shadow-fuchsia-500/20",
      btnGlow: "shadow-fuchsia-500/20",
      progressBar: "from-fuchsia-500 to-pink-500",
      discBorder: "border-fuchsia-500/35",
      grooveBorder: "border-fuchsia-500/40",
      waveColors: [
        "rgba(217, 70, 239, 0.8)",  // fuchsia
        "rgba(244, 63, 94, 0.5)",   // rose
        "rgba(139, 92, 246, 0.3)",  // violet
        "rgba(217, 70, 239, 0.15)"
      ]
    },
    neutral: {
      text: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      bg: "bg-neutral-900 border-neutral-800",
      accent: "text-cyan-400",
      primaryBtn: "bg-gradient-to-r from-cyan-450 via-teal-450 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-neutral-950",
      btnGlow: "shadow-cyan-500/15",
      progressBar: "from-cyan-400 to-purple-500",
      discBorder: "border-purple-500/35",
      grooveBorder: "border-cyan-500/40",
      waveColors: [
        "rgba(6, 182, 212, 0.8)",   // aquamarine/cyan
        "rgba(168, 85, 247, 0.5)",  // amethyst/purple
        "rgba(20, 184, 166, 0.3)",  // teal
        "rgba(6, 182, 212, 0.15)"
      ]
    },
  };

  const activeEmotion = script[currentIndex]?.emotion || "neutral";
  const currentTheme = EMOTION_THEMES[activeEmotion] || EMOTION_THEMES["neutral"];

  // Background Eager Pre-fetching to reduce transitions latency to zero
  useEffect(() => {
    if (!script || script.length === 0) return;

    // Prefetch upcoming 3 paragraphs
    const lookaheadCount = 3;
    const prefetchIndexes = Array.from({ length: lookaheadCount }, (_, i) => currentIndex + 1 + i)
      .filter((idx) => idx < script.length && !audioCache[idx] && !fetchingIndexesRef.current.has(idx));

    prefetchIndexes.forEach(async (idx) => {
      fetchingIndexesRef.current.add(idx);
      try {
        const item = script[idx];
        const response = await fetch("/api/generate-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: item.text,
            voiceName: voice.voiceName,
            instruction: item.instruction,
            vocalModifier: voice.vocalModifier,
          }),
        });
        if (response.ok) {
          const { wavBase64 } = await response.json();
          setAudioCache((prev) => {
            if (prev[idx]) return prev;
            return { ...prev, [idx]: wavBase64 };
          });
        }
      } catch (e) {
        console.warn("Background prefetch failed for idx", idx, e);
      } finally {
        fetchingIndexesRef.current.delete(idx);
      }
    });
  }, [currentIndex, script, voice, audioCache]);

  // Audio Canvas Waveform Drawing effect
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    const colors = currentTheme.waveColors;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;

      // Draw beautiful dynamic overlapping wave lines
      const wavesCount = 4;

      phase += isPlaying ? 0.075 : 0.012; // Frequency of motion

      for (let i = 0; i < wavesCount; i++) {
        ctx.beginPath();
        ctx.lineWidth = i === 0 ? 2.5 : 1.25;
        ctx.strokeStyle = colors[i] || "rgba(20, 184, 166, 0.75)";

        // Wave parameters
        const amplitude = isPlaying
          ? (height / 2.2) * (1 - i * 0.22) * (0.85 + Math.sin(phase * 1.4 + i * 0.9) * 0.15)
          : 3; // resting flat-line state if paused

        const frequency = 0.025 + i * 0.004;

        for (let x = 0; x < width; x++) {
          const borderFade = Math.sin((x / width) * Math.PI); // Fades smooth towards margins
          const y = height / 2 + Math.sin(x * frequency + phase + i * 1.5) * amplitude * borderFade;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, voice, currentIndex, script, currentTheme]);

  // Clean up active audio if component unmounts
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  // Sync playback rate speed changes
  useEffect(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Scroll current paragraph into view
  useEffect(() => {
    const el = paragraphRefs.current[currentIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  // Load and play a specific chunk audio
  const getAudioForIndex = async (index: number): Promise<string> => {
    if (audioCache[index]) {
      return audioCache[index];
    }

    setLoadingIndex(index);
    try {
      const item = script[index];
      const response = await fetch("/api/generate-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text,
          voiceName: voice.voiceName,
          instruction: item.instruction,
          vocalModifier: voice.vocalModifier,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed synthesizing TTS chunk ${index}`);
      }

      const { wavBase64 } = await response.json();
      setAudioCache((prev) => ({ ...prev, [index]: wavBase64 })); // Keep raw base64 for assembling
      setLoadingIndex(null);
      return wavBase64;
    } catch (e) {
      setLoadingIndex(null);
      throw e;
    }
  };

  const playChunk = async (index: number) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    try {
      const wavBase64 = await getAudioForIndex(index);
      const audioUrl = `data:audio/wav;base64,${wavBase64}`;
      const audio = new Audio(audioUrl);
      
      activeAudioRef.current = audio;
      audio.playbackRate = playbackSpeed;
      audio.play();
      setIsPlaying(true);
      setCurrentIndex(index);

      audio.onended = () => {
        handleTrackFinished(index);
      };
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
    }
  };

  const handleTrackFinished = (finishedIndex: number) => {
    const nextIndex = finishedIndex + 1;
    if (nextIndex < script.length) {
      setCurrentIndex(nextIndex);
      playChunk(nextIndex);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.play();
        setIsPlaying(true);
      } else {
        playChunk(currentIndex);
      }
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < script.length) {
      setCurrentIndex(nextIndex);
      if (isPlaying || activeAudioRef.current) {
        playChunk(nextIndex);
      }
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentIndex(prevIndex);
      if (isPlaying || activeAudioRef.current) {
        playChunk(prevIndex);
      }
    }
  };

  // Pre-load all chunks to create a consolidated full download file block
  const handleAssembleFullBook = async () => {
    setIsAssemblingFullBook(true);
    try {
      // Gather and synthesis any un-cached audiobook paragraphs
      const base64List: string[] = [];
      for (let i = 0; i < script.length; i++) {
        const rawBase64 = await getAudioForIndex(i);
        base64List.push(rawBase64);
      }

      // Merge paragraphs into a single WAV Blob using standard WAV binary merger
      const mergedBlob = combineWavs(base64List);
      const url = URL.createObjectURL(mergedBlob);
      setFullAudioBlobUrl(url);
    } catch (e) {
      console.error(e);
      alert("Failed fully compiling audiobook. Deep network check or GEMINI_API_KEY could be hitting rate limits.");
    } finally {
      setIsAssemblingFullBook(false);
    }
  };

  // Convert multiple raw Base64 WAV files into a single continuous stream
  const combineWavs = (wavsBase64: string[]): Blob => {
    const pcmBuffers: ArrayBuffer[] = [];
    let totalPcmLength = 0;

    for (const b64 of wavsBase64) {
      const binaryString = atob(b64);
      const byteLen = binaryString.length;
      
      // A standard RIFF WAVE header takes 44 bytes. Strip header to get raw PCM samples
      if (byteLen <= 44) continue;
      const pcmLength = byteLen - 44;
      const pcmBytes = new Uint8Array(pcmLength);
      
      for (let i = 0; i < pcmLength; i++) {
        pcmBytes[i] = binaryString.charCodeAt(i + 44);
      }
      pcmBuffers.push(pcmBytes.buffer);
      totalPcmLength += pcmLength;
    }

    // Allocate continuous WAV layout
    const finalBuffer = new ArrayBuffer(44 + totalPcmLength);
    const view = new DataView(finalBuffer);

    // Assemble WAV descriptor headers
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + totalPcmLength, true); // Total sub size
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // size
    view.setUint16(20, 1, true); // Linear PCM
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, 24000, true); // Sample rate 24000 Hz
    view.setUint32(28, 24000 * 2, true); // Byte rate
    view.setUint16(32, 2, true); // block aligned
    view.setUint16(34, 16, true); // 16 Bit depth

    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, totalPcmLength, true); // size

    const finalBytes = new Uint8Array(finalBuffer);
    let offset = 44;
    for (const buf of pcmBuffers) {
      finalBytes.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    return new Blob([finalBytes], { type: "audio/wav" });
  };

  // Compile book statistics breakdown
  const emotionStats = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    script.forEach((item) => {
      counts[item.emotion] = (counts[item.emotion] || 0) + 1;
    });
    
    return Object.entries(counts).map(([emotion, val]) => ({
      emotion,
      percentage: Math.round((val / script.length) * 100),
      count: val,
    })).sort((a, b) => b.percentage - a.percentage);
  }, [script]);

  const progressPercentage = script.length ? Math.round(((currentIndex + 1) / script.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="audiobook-player-layout">
      {/* Left side column: Book details, voice attributes, and player controls */}
      <div className="lg:col-span-1 space-y-6">
        {/* Album / Audiobook Cover Display */}
        <div className="relative overflow-hidden bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800/85 rounded-2xl p-6 shadow-2xl transition-all duration-500">
          <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent ${currentTheme.primaryBtn.includes("purple") ? "via-purple-500/40" : "via-cyan-  500/40"} to-transparent transition-all duration-500`} />
          <div className={`absolute top-0 right-0 w-32 h-32 ${currentTheme.primaryBtn.includes("purple") ? "bg-purple-500/5" : "bg-cyan-500/5"} rounded-full blur-3xl opacity-60 transition-all duration-500`} />
          
          <div className="flex flex-col items-center text-center">
            {/* Ambient visual glowing disc */}
            <div className={`w-40 h-40 rounded-full border-2 bg-neutral-950 flex flex-col justify-center items-center shadow-2xl relative overflow-hidden mb-5 group ${isPlaying ? currentTheme.discBorder : "border-neutral-800/80"} transition-all duration-500`}>
              {/* Spinning Record Center */}
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <canvas 
                  ref={canvasRef} 
                  width={200} 
                  height={100} 
                  className="absolute inset-0 w-full h-[70%] top-[15%] pointer-events-none opacity-90" 
                />
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-neutral-900/90 border ${currentTheme.accent} transition-colors duration-500 shadow-inner`}>
                  <Volume2 className={`w-6 h-6 ${isPlaying ? "animate-bounce" : ""}`} />
                </div>
              </div>

              {/* Glowing vinyl circle groove */}
              <div className={`absolute inset-1.5 rounded-full border border-dashed opacity-25 animate-spin [animation-duration:30s] ${isPlaying ? "" : "[animation-play-state:paused]"} ${currentTheme.grooveBorder} transition-all duration-500`} />
            </div>

            <span className={`text-xs ${currentTheme.bg} ${currentTheme.accent} font-mono font-semibold px-3 py-1 rounded-full uppercase tracking-wide mb-2 flex items-center gap-1.5 border transition-all duration-500`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-current animate-ping" : "bg-neutral-500"}`} />
              Audiobook Active • {activeEmotion}
            </span>
            <h3 className="text-lg font-black tracking-tight text-neutral-100 max-w-full truncate">{title}</h3>
            <p className="text-xs text-neutral-400 mt-1">Narrated in the voice of <strong className={`${currentTheme.accent} font-bold transition-all duration-500`}>{voice.name}</strong></p>
          </div>

          {/* Quick Stats: duration/sections */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-800/80 text-center">
            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-500 block">Total Paragraphs</span>
              <span className="text-lg font-bold text-neutral-200">{script.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-500 block">Active Section</span>
              <span className={`text-lg font-bold ${currentTheme.accent} transition-colors duration-500`}>{currentIndex + 1} / {script.length}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Player Controls */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Timeline slider representation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Book progress
              </span>
              <span>{currentIndex + 1} / {script.length} ({progressPercentage}%)</span>
            </div>
            <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/50">
              <div
                className={`h-full bg-gradient-to-r ${currentTheme.progressBar} transition-all duration-500`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Main Controls row */}
          <div className="flex items-center justify-center gap-4">
            <button
              id="player-prev-btn"
              disabled={currentIndex === 0}
              onClick={handlePrevious}
              className="p-3 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-full transition"
              title="Previous Paragraph"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              id="player-play-btn"
              onClick={handlePlayPause}
              className={`p-5 ${currentTheme.primaryBtn} hover:scale-110 rounded-full transition duration-300 scale-105 active:scale-95`}
              title={isPlaying ? "Pause" : "Play"}
            >
              {loadingIndex === currentIndex ? (
                <RefreshCw className="w-6 h-6 animate-spin text-neutral-950" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 fill-current text-neutral-950" />
              ) : (
                <Play className="w-6 h-6 fill-current text-neutral-950 translate-x-0.5" />
              )}
            </button>

            <button
              id="player-next-btn"
              disabled={currentIndex === script.length - 1}
              onClick={handleNext}
              className="p-3 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-full transition"
              title="Next Paragraph"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Speed Setting Controls & Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800/80">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-mono text-neutral-500">Speed:</span>
              {[1, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  id={`speed-${speed}-btn`}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 text-xs font-semibold rounded transition duration-300 ${
                    playbackSpeed === speed
                      ? `${currentTheme.primaryBtn}`
                      : "bg-neutral-950 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <button
              id="player-reset-btn"
              onClick={onReset}
              className="flex items-center gap-1 px-3 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-semibold rounded transition"
            >
              <RefreshCw className="w-3 h-3" /> Swap Book
            </button>
          </div>
        </div>

        {/* Emotion Distribution Graph */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className={`w-4 h-4 ${currentTheme.accent} transition-colors duration-500`} />
            Emotional Story Distribution
          </h4>
          
          <div className="space-y-3">
            {emotionStats.map(({ emotion, percentage, count }) => (
              <div key={emotion} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 flex items-center gap-1 capitalize font-medium">
                    <span>{emotionEmojis[emotion] || "🎙️"}</span> {emotion}
                  </span>
                  <span className="text-neutral-500 font-mono text-[11px] font-bold">{count} {count === 1 ? "part" : "parts"} ({percentage}%)</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      emotion === "suspenseful" ? "bg-purple-500"
                      : emotion === "joyous" ? "bg-teal-500"
                      : emotion === "sorrowful" ? "bg-blue-500"
                      : emotion === "angry" ? "bg-rose-500"
                      : emotion === "excited" ? "bg-indigo-500"
                      : emotion === "serene" ? "bg-cyan-500"
                      : emotion === "terrified" ? "bg-red-500"
                      : emotion === "astonished" ? "bg-pink-500"
                      : "bg-fuchsia-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: 2 columns of Live Interactive Script & Narration tracker */}
      <div className="lg:col-span-2 flex flex-col space-y-4">
        {/* Audiobook compilation & download section */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-2 justify-center md:justify-start">
              <Sparkles className={`w-4 h-4 ${currentTheme.accent} transition-colors duration-500`} />
              Consolidated Audiobook Export
            </h4>
            <p className="text-xs text-neutral-400">
              Combine all sequential emotional paragraphs into a single consolidated masterpiece WAV file for offline listen!
            </p>
          </div>

          <div>
            {fullAudioBlobUrl ? (
              <div className="flex items-center gap-3">
                <a
                  href={fullAudioBlobUrl}
                  download={`${title.toLowerCase().replace(/\s+/g, "_")}_audiobook.wav`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-sm font-bold rounded-xl transition shadow-lg shadow-emerald-500/10"
                >
                  <CheckCircle className="w-4 h-4" /> Download Full WAV
                </a>
                <button
                  onClick={() => {
                    setFullAudioBlobUrl(null);
                    handleAssembleFullBook();
                  }}
                  className="p-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-xl transition"
                  title="Recompile Audiobook"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="compile-full-audiobook-btn"
                disabled={isAssemblingFullBook}
                onClick={handleAssembleFullBook}
                className={`flex items-center gap-2 px-5 py-2.5 ${currentTheme.primaryBtn} disabled:bg-neutral-800 disabled:text-neutral-600 text-neutral-950 text-xs md:text-sm font-bold rounded-xl transition duration-500`}
              >
                {isAssemblingFullBook ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                    Assembling paragraphs...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Compile Full Audiobook
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Narrative Script Reader Grid */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-6 shadow-xl flex-1 flex flex-col overflow-hidden min-h-[450px]">
          <div className="border-b border-neutral-800 pb-4 mb-4 flex items-center justify-between">
            <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Info className={`w-4.5 h-4.5 ${currentTheme.accent} transition-colors duration-500`} />
              Live Interactive Read-Along View
            </h4>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest hidden md:inline">
              PROMPT NARRATOR MARKS ACTIVE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scroll-smooth max-h-[600px]">
            {script.map((item, index) => {
              const isActive = index === currentIndex;
              const isCellLoading = loadingIndex === index;
              const itemTheme = EMOTION_THEMES[item.emotion] || EMOTION_THEMES["neutral"];
              
              return (
                <div
                  key={index}
                  ref={(el) => (paragraphRefs.current[index] = el)}
                  onClick={() => playChunk(index)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                    isActive
                      ? `bg-neutral-800/80 border-cyan-500/60 shadow-md transform scale-[1.01]`
                      : "bg-neutral-950/20 border-neutral-800/60 hover:bg-neutral-800/10 hover:border-neutral-800/90"
                  }`}
                >
                  {/* Left Side Active Glow Border */}
                  {isActive && (
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${currentTheme.primaryBtn.includes("purple") ? "bg-purple-500" : currentTheme.primaryBtn.includes("teal") ? "bg-teal-500" : currentTheme.primaryBtn.includes("blue") ? "bg-indigo-500" : currentTheme.primaryBtn.includes("rose") ? "bg-rose-500" : currentTheme.primaryBtn.includes("cyan") ? "bg-cyan-500" : currentTheme.primaryBtn.includes("pink") ? "bg-pink-500" : currentTheme.primaryBtn.includes("fuchsia") ? "bg-fuchsia-500" : "bg-cyan-500"} rounded-l-xl`} />
                  )}

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 mb-2.5">
                    {/* Emotion and Section indicator */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-neutral-500 px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded">
                        Section {index + 1}
                      </span>
                      
                      <span className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded border ${itemTheme.text}`}>
                        {emotionEmojis[item.emotion] || "🎙️"} {item.emotion}
                      </span>
                    </div>

                    {/* Speech Prompt Guidance badge */}
                    <span className={`text-[10px] font-medium ${isActive ? currentTheme.accent : "text-neutral-500"} bg-neutral-950 px-2 py-1 rounded border border-neutral-800/50 italic mr-6 transition-colors duration-500`}>
                      🧠 Instruction: "{item.instruction}"
                    </span>
                  </div>

                  {/* Paragraph text */}
                  <p
                    className={`text-sm leading-relaxed transition ${
                      isActive ? "text-neutral-100 font-medium" : "text-neutral-400 group-hover:text-neutral-300"
                    }`}
                  >
                    {item.text}
                  </p>

                  {/* Action indicators */}
                  <div className={`absolute right-4 bottom-4 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center p-1.5 rounded-full bg-neutral-900 border border-neutral-800 ${currentTheme.accent}`}>
                    {isCellLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isActive && isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
