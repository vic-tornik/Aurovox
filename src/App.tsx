import React, { useState, useEffect } from "react";
import { STORY_PRESETS, VOICE_PROFILES } from "./data";
import { StoryPreset, VoiceProfile, ScriptEntry, User } from "./types";
import StorySelector from "./components/StorySelector";
import VoiceSelector from "./components/VoiceSelector";
import AudiobookPlayer from "./components/AudiobookPlayer";
import AuthModal from "./components/AuthModal";
import { 
  Sparkles, Headphones, CheckCircle, RefreshCw, AlertCircle, Play, Heart,
  Lock, Unlock, LogOut, Key, Fingerprint, ShieldCheck, ChevronDown, UserCheck, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [selectedStory, setSelectedStory] = useState<StoryPreset>(STORY_PRESETS[1]); // Default to "The Happy Prince"
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(VOICE_PROFILES[0]); // Default to Kore (Warm Female)
  const [isEmotionalDynamic, setIsEmotionalDynamic] = useState<boolean>(true);
  
  // Secure User Authentication States
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<"login" | "register" | "mfa-verify" | "mfa-setup" | "email-verify" | "change-password">("login");
  const [showSecurityDropdown, setShowSecurityDropdown] = useState<boolean>(false);

  // Load session from cookie on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error("Session lookup timing failure:", err);
      }
    };
    fetchSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setShowSecurityDropdown(false);
      setScript(null); // Reset active audiobook players on logout
    } catch (err) {
      console.error("Erase session connection failed:", err);
    }
  };
  
  // Script and Synthesis status
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [script, setScript] = useState<ScriptEntry[] | null>(null);
  const [assemblyError, setAssemblyError] = useState<string | null>(null);

  // Allows configuring a custom un-preset text
  const handleCustomTextSelected = (text: string, title?: string) => {
    const customPreset: StoryPreset = {
      id: "custom",
      title: title || "My Novel Chapter",
      author: "Local Writer",
      description: "Custom uploaded manuscript text file.",
      genre: "Custom Upload",
      coverColor: "from-purple-950 to-neutral-950 border-purple-900/30",
      text,
    };
    setSelectedStory(customPreset);
  };

  // The Magic "One-Click" Synthesis Engine call
  const handleSynthesizeAudiobook = async () => {
    if (!user) {
      setAuthModalInitialMode("login");
      setAuthModalOpen(true);
      return;
    }

    if (!selectedStory || !selectedStory.text.trim()) {
      alert("Please select or paste some story content first.");
      return;
    }

    setIsProcessing(true);
    setAssemblyError(null);
    setProcessingStep("🔍 Reading ebook and analyzing chapter layouts...");

    try {
      // Step 1: Request emotional layout script from Gemini backend
      const analyzeResponse = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedStory.text }),
      });

      if (!analyzeResponse.ok) {
        throw new Error("Failed during structural script parsing and analysis check.");
      }

      setProcessingStep("🎭 Modeling scene themes & assigning emotional acting markers...");
      const { script: rawScript } = await analyzeResponse.json();

      if (!rawScript || rawScript.length === 0) {
        throw new Error("Gemini returns empty paragraphs. Try reloading or pasting smaller segments.");
      }

      // If Vivid Emotional Acting is disabled, overwrite individual instructions with standard narrations
      const finalScript: ScriptEntry[] = rawScript.map((chunk: any) => {
        if (!isEmotionalDynamic) {
          return {
            ...chunk,
            emotion: "neutral",
            instruction: "Narrate calmly in standard voice tone",
          };
        }
        return chunk;
      });

      setProcessingStep("🚀 Assembling audiobook tracks and opening Player card...");
      setScript(finalScript);
      setIsProcessing(false);
    } catch (e: any) {
      console.error(e);
      setAssemblyError(e.message || "Something went wrong synthesizing your novel.");
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setScript(null);
    setAssemblyError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header Bar */}
      <header className="border-b border-neutral-900/80 bg-neutral-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-neutral-950 focus:ring shadow-md shadow-cyan-500/10">
            <Headphones className="w-5 h-5 stroke-[2.5px]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-neutral-100 flex items-center gap-1.5">
              AuraVox Producer
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono font-bold border border-cyan-500/15">
                V3.5 FLASH
              </span>
            </h1>
            <p className="text-[10px] text-neutral-500 font-mono">POWERED BY GEMINI SPEECH SYNTHESIS</p>
          </div>
        </div>

        {/* Dynamic Secure Auth Menu Blocks */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              Dynamic Acting Soundstage Active
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!user ? (
              <motion.button
                id="header-login-btn"
                key="login-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => {
                  setAuthModalInitialMode("login");
                  setAuthModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-neutral-950 text-xs font-bold font-sans tracking-wide uppercase rounded-xl transition cursor-pointer hover:from-cyan-400 hover:to-cyan-500 hover:scale-[1.02] shadow shadow-cyan-500/10 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Sign In / Join
              </motion.button>
            ) : (
              <motion.div
                key="user-badge"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <button
                  id="user-profile-menu-trigger"
                  onClick={() => setShowSecurityDropdown(!showSecurityDropdown)}
                  className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-850/85 px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-200 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-cyan-400/20 flex items-center justify-center text-[10px] text-cyan-400 font-bold font-sans">
                    {user.email.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate text-neutral-300 font-mono hidden sm:inline">
                    {user.email}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${showSecurityDropdown ? "rotate-180" : ""}`} />
                </button>

                {showSecurityDropdown && (
                  <div 
                    id="user-profile-dropdown"
                    className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800/90 rounded-2xl p-4 shadow-2xl z-50 space-y-3 font-sans"
                  >
                    <div className="border-b border-neutral-800 pb-2.5">
                      <p className="text-[9px] font-bold font-mono text-neutral-500 uppercase tracking-widest">Active Account Profile</p>
                      <p className="text-xs font-medium text-neutral-200 truncate select-all">{user.email}</p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1 text-neutral-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          MFA Security Checklist
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                          user.mfaEnabled 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" 
                            : "bg-amber-500/10 text-amber-500 border-amber-500/15"
                        }`}>
                          {user.mfaEnabled ? "PROTECTED" : "NOT SET"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span className="flex items-center gap-1 text-neutral-400">
                          <Fingerprint className="w-3.5 h-3.5 text-teal-400" />
                          WebAuthn Biometrics
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                          user.passkeyRegistered 
                            ? "bg-teal-500/10 text-teal-400 border-teal-500/15"
                            : "bg-neutral-800 text-neutral-500 border-neutral-800/15"
                        }`}>
                          {user.passkeyRegistered ? "ENROLLED" : "INACTIVE"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-neutral-800 pt-2.5 space-y-1.5">
                      <button
                        id="user-menu-change-password-btn"
                        onClick={() => {
                          setShowSecurityDropdown(false);
                          setAuthModalInitialMode("change-password");
                          setAuthModalOpen(true);
                        }}
                        className="w-full text-left py-2 px-3 rounded-lg hover:bg-neutral-800 hover:text-neutral-250 text-[11.5px] text-neutral-400 font-medium flex items-center gap-2 transition cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-neutral-500" />
                        Change Password
                      </button>

                      <button
                        onClick={() => {
                          setShowSecurityDropdown(false);
                          setAuthModalInitialMode("mfa-verify");
                          setAuthModalOpen(true);
                        }}
                        className="w-full text-left py-2 px-3 rounded-lg hover:bg-neutral-800 hover:text-neutral-250 text-[11.5px] text-neutral-400 font-medium flex items-center gap-2 transition cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-neutral-500" />
                        Authentication Settings
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full text-left py-2 px-3 rounded-lg hover:bg-red-950/20 hover:text-red-300 text-[11.5px] text-red-400 font-medium flex items-center gap-2 transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-400/85" />
                        Disconnect Profile
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        <AnimatePresence mode="wait">
          {!script && !isProcessing && (
            <motion.div
              key="setup-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Marketing Hero Prompt */}
              <div className="relative overflow-hidden bg-neutral-900/50 border border-neutral-800/80 rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl opacity-50" />
                
                <div className="space-y-4 max-w-3xl text-center md:text-left">
                  <span className="text-[11px] font-bold font-mono tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full uppercase border border-cyan-500/10">
                    One-Click Emotional Soundstage
                  </span>
                  <h2 className="text-2xl md:text-3.5xl font-black text-neutral-100 tracking-tight leading-tight">
                    Convert any Novel into Cinematic <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Audiobooks</span> Instantly.
                  </h2>
                  <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">
                    Experience state-of-the-art voice synthesis that analyzes the narrative context. It automatically shapes voice styles (whispering in horror, exclaiming in joy, crying in sorrow) paragraph-by-paragraph to create real emotional human delivery.
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <button
                    id="hero-synthesize-action-btn"
                    onClick={handleSynthesizeAudiobook}
                    className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 active:scale-95 text-neutral-950 text-base font-extrabold rounded-2xl transition shadow-xl shadow-cyan-500/15"
                  >
                    <Play className="w-5 h-5 fill-current text-neutral-950" />
                    One-Click Audiobook Convert
                  </button>
                </div>
              </div>

              {/* Error box indicator */}
              {assemblyError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-red-400">Audiobook Compilation Failed</h5>
                    <p className="mt-1 leading-relaxed text-xs">
                      {assemblyError}
                    </p>
                    <p className="mt-2 text-[10px] text-red-500/80 font-mono">
                      Check that your GEMINI_API_KEY environment variable is configured in the Secrets panel in Google AI Studio Settings.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1: Novel Ebook Selector */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest block">
                  STEP 1 — CHOOSE OR UPLOAD SCENE
                </span>
                <StorySelector
                  selectedStory={selectedStory}
                  onSelectStory={setSelectedStory}
                  onCustomTextChange={handleCustomTextSelected}
                />
              </div>

              {/* Step 2: Voice & Style Selector */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest block">
                  STEP 2 — CONFIGURE VOCAL PROFILES
                </span>
                <VoiceSelector
                  selectedVoice={selectedVoice}
                  onSelectVoice={setSelectedVoice}
                  isEmotionalDynamic={isEmotionalDynamic}
                  onToggleEmotionalDynamic={setIsEmotionalDynamic}
                />
              </div>

              {/* Step 3: Synthesis Button */}
              <div className="flex justify-center pt-4">
                <button
                  id="final-synthesize-btn"
                  onClick={handleSynthesizeAudiobook}
                  className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 transform active:scale-95 text-neutral-950 text-lg font-black rounded-2xl transition-all shadow-2xl shadow-cyan-500/10"
                >
                  <Sparkles className="w-5 h-5 fill-cyan-950/20 group-hover:scale-125 transition-transform" />
                  Synthesize Audiobook ({selectedStory.title})
                </button>
              </div>
            </motion.div>
          )}

          {/* Loading / Splitting Screen */}
          {isProcessing && (
            <motion.div
              key="loading-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="max-w-xl mx-auto py-16 text-center space-y-8"
              id="processing-stage-container"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-cyan-500/10 border-2 border-cyan-500/20 mx-auto flex items-center justify-center text-cyan-500">
                  <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Headphones className="w-6 h-6 text-neutral-100" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-bold text-neutral-100">Analyzing Ebook Dramatic Blueprint</h3>
                <p className="text-sm text-cyan-400 font-medium font-mono min-h-[20px]">
                  {processingStep}
                </p>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  We are segmenting the book paragraphs and instructing Gemini's speech models, preparing standard text formats into high-fidelity voice profiles. This will take a few seconds...
                </p>
              </div>

              {/* Simulated Loading Steps Tracker */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-left space-y-4 max-w-md mx-auto shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5 fill-current text-emerald-400" />
                  </div>
                  <span className="text-xs text-neutral-300 font-medium">Read ebook and split structural paragraphs</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    processingStep.includes("Modeling") || processingStep.includes("Assembling")
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-neutral-950 border border-neutral-800 text-neutral-600 animate-pulse"
                  }`}>
                    {processingStep.includes("Modeling") || processingStep.includes("Assembling") ? (
                      <CheckCircle className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    processingStep.includes("Modeling") || processingStep.includes("Assembling") ? "text-neutral-300" : "text-neutral-500"
                  }`}>
                    Analyze context and assign emotional speaker triggers
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    processingStep.includes("Assembling")
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-neutral-950 border border-neutral-800 text-neutral-600"
                  }`}>
                    {processingStep.includes("Assembling") ? (
                      <CheckCircle className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    processingStep.includes("Assembling") ? "text-neutral-300" : "text-neutral-500"
                  }`}>
                    Deliver script arrays to standard audio soundstage
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Audiobook Live Player Dashboard */}
          {script && !isProcessing && (
            <motion.div
              key="player-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <AudiobookPlayer
                script={script}
                voice={selectedVoice}
                title={selectedStory.title}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-neutral-900/60 py-6 text-center text-[11px] text-neutral-600 bg-neutral-950 mt-16 font-mono flex flex-col md:flex-row items-center justify-between px-6 gap-2">
        <span>AuraVox Producer V3.5</span>
        <span className="flex items-center gap-1">
          Made for literature lovers with <Heart className="w-3 h-3 text-red-500/80 fill-current" />
        </span>
      </footer>

      {/* Secure Authentication Overlay Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalInitialMode}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)}
      />
    </div>
  );
}
