import React, { useState, useEffect } from "react";
import { 
  Lock, Unlock, Mail, Shield, Key, Fingerprint, Eye, EyeOff, 
  AlertTriangle, Check, CheckCircle2, User, RefreshCw, X, ArrowRight, ShieldCheck, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User as UserType } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
  initialMode?: "login" | "register" | "mfa-verify" | "mfa-setup" | "email-verify" | "change-password";
}

type AuthMode = "login" | "register" | "mfa-verify" | "mfa-setup" | "email-verify" | "change-password";

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  
  // Custom non-intrusive Bot Protection Slider State
  const [botChecked, setBotChecked] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  // Password Strength interactive evaluations
  const [passRules, setPassRules] = useState({
    length: false,
    upper: false,
    lower: false,
    num: false,
    sym: false
  });

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassRules, setNewPassRules] = useState({
    length: false,
    upper: false,
    lower: false,
    num: false,
    sym: false
  });

  // MFA & Passkey State
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaBackupCode, setMfaBackupCode] = useState<string | null>(null);
  const [mfaPin, setMfaPin] = useState("");
  const [tempMfaUserEmail, setTempMfaUserEmail] = useState("");
  const [isPasskeyEnrolling, setIsPasskeyEnrolling] = useState(false);
  const [passkeyEnrollSuccess, setPasskeyEnrollSuccess] = useState(false);

  // Passkey login flow state
  const [isBiometricPromptOpen, setIsBiometricPromptOpen] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<"idle" | "scanning" | "matched" | "failed">("idle");

  // Loading/UX Error feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Monitor initialMode changes
  useEffect(() => {
    if (isOpen && initialMode) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setBotChecked(false);
      setSliderPosition(0);
      setCurrentPassword("");
      setNewPassword("");
    }
  }, [isOpen, initialMode]);

  // Monitor Password Strength
  useEffect(() => {
    if (mode === "register") {
      setPassRules({
        length: password.length >= 12,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        num: /[0-9]/.test(password),
        sym: /[^A-Za-z0-9]/.test(password)
      });
    } else if (mode === "change-password") {
      setNewPassRules({
        length: newPassword.length >= 12,
        upper: /[A-Z]/.test(newPassword),
        lower: /[a-z]/.test(newPassword),
        num: /[0-9]/.test(newPassword),
        sym: /[^A-Za-z0-9]/.test(newPassword)
      });
    }
  }, [password, newPassword, mode]);

  // Reset errors on mode swift
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setBotChecked(false);
    setSliderPosition(0);
    setVerificationCode("");
    setMfaPin("");
    setCurrentPassword("");
    setNewPassword("");
  };

  // Submit Handler: CHANGE PASSWORD
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botChecked) {
      setErrorMessage("Please complete the bot safety verification first.");
      return;
    }

    const allNewValid = Object.values(newPassRules).every(Boolean);
    if (!allNewValid) {
      setErrorMessage("New password does not satisfy all security criteria securely.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setErrorMessage(data.error || "Password change failed. Verify credentials.");
        setBotChecked(false);
        setSliderPosition(0);
        return;
      }

      setSuccessMessage("Password successfully changed!");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage("Password server connection timed out.");
    }
  };

  // Bot Protection Handle Slider
  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSliding || botChecked) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const track = document.getElementById("bot-slider-track");
    if (!track) return;
    
    const rect = track.getBoundingClientRect();
    const pos = Math.min(Math.max(0, clientX - rect.left), rect.width - 44);
    const percentage = (pos / (rect.width - 44)) * 100;
    
    setSliderPosition(percentage);
    if (percentage > 95) {
      setBotChecked(true);
      setIsSliding(false);
      setSliderPosition(100);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (isSliding && !botChecked) {
        setIsSliding(false);
        setSliderPosition(0);
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isSliding, botChecked]);

  // Submit Handler: LOGIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botChecked) {
      setErrorMessage("Please complete the bot safety verification first.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        if (data.requiresVerification) {
          setErrorMessage(data.error);
          setTempMfaUserEmail(data.email);
          switchMode("email-verify");
          return;
        }
        // Generic messaging for authentication failures to prevent enumeration
        setErrorMessage(data.error || "Invalid username or password");
        setBotChecked(false);
        setSliderPosition(0);
        return;
      }

      if (data.mfaRequired) {
        setTempMfaUserEmail(data.email);
        switchMode("mfa-verify");
        return;
      }

      setSuccessMessage("Logged in successfully!");
      setTimeout(() => {
        onAuthSuccess(data.user);
        onClose();
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage("Authentication server currently unreachable. Try again shortly.");
    }
  };

  // Submit Handler: REGISTER
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!botChecked) {
      setErrorMessage("Please slide the bot-gate check to secure registration.");
      return;
    }

    const allValid = Object.values(passRules).every(Boolean);
    if (!allValid) {
      setErrorMessage("Password strength criteria not satisfied securely.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setErrorMessage(data.error || "Registration failed. Try changing details.");
        setBotChecked(false);
        setSliderPosition(0);
        return;
      }

      setTempMfaUserEmail(email);
      setSuccessMessage("Credential registered! Check registration code sent below.");
      setTimeout(() => {
        switchMode("email-verify");
      }, 1500);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage("Could not submit authentication forms. Try again.");
    }
  };

  // Submit Handler: EMAIL VERIFY
  const handleEmailVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tempMfaUserEmail || email, code: verificationCode })
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setErrorMessage(data.error || "Incorrect validation token entered.");
        return;
      }

      setSuccessMessage("Email successfully verified! Welcome aboard.");
      setTimeout(() => {
        onAuthSuccess(data.user);
        onClose();
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage("Server timing out. Verify connection.");
    }
  };

  // Submit Handler: MFA VERIFY
  const handleMfaVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tempMfaUserEmail, password, mfaCode: mfaPin })
      });

      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setErrorMessage("Invalid 2FA Authenticator code.");
        return;
      }

      setSuccessMessage("Dual-factor authentication complete!");
      setTimeout(() => {
        onAuthSuccess(data.user);
        onClose();
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage("2FA network assertion error.");
    }
  };

  // PASSKEY FLOW: REGISTER / BIND BIOMETRICS
  const handlePasskeyBinding = async () => {
    setIsPasskeyEnrolling(true);
    setErrorMessage(null);

    try {
      const resVal = await fetch("/api/auth/passkey/register-challenge", { method: "POST" });
      const challengeData = await resVal.json();

      if (!resVal.ok) throw new Error(challengeData.error);

      // Trigger TouchId/FaceId authenticators mockup interaction
      setBiometricStatus("scanning");
      setIsBiometricPromptOpen(true);

      // Simulate biometric scan delay
      await new Promise(r => setTimeout(r, 2000));

      // Mocking credentials pairing
      const credentialId = "cred_" + crypto.randomUUID().substring(0, 8);
      const publicKey = "EC_PUBLIC_KEY_SECP256R1_" + crypto.randomUUID().substring(0, 16);

      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, publicKey })
      });

      if (!verifyRes.ok) throw new Error("Server declined passkey credentials.");

      setBiometricStatus("matched");
      setTimeout(() => {
        setIsBiometricPromptOpen(false);
        setPasskeyEnrollSuccess(true);
        setIsPasskeyEnrolling(false);
        // Refresh session to apply passkey binding tags
        fetch("/api/auth/session")
          .then(r => r.json())
          .then(data => {
            if (data.user) onAuthSuccess(data.user);
          });
      }, 1200);

    } catch (err: any) {
      setBiometricStatus("failed");
      setIsPasskeyEnrolling(false);
      setErrorMessage(err.message || "Credential mapping failed.");
      setTimeout(() => setIsBiometricPromptOpen(false), 2000);
    }
  };

  // PASSKEY LOGIN FLOW
  const handlePasskeyLogin = async () => {
    if (!email) {
      setErrorMessage("Please input email in fields to search passkey records.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const resVal = await fetch("/api/auth/passkey/login-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const chalData = await resVal.json();
      if (!resVal.ok) {
        throw new Error(chalData.error || "Account passkey not setup or not unique.");
      }

      setBiometricStatus("scanning");
      setIsBiometricPromptOpen(true);

      // Scanning Touch sensor delay
      await new Promise(r => setTimeout(r, 1800));

      const loginRes = await fetch("/api/auth/passkey/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credentialId: chalData.credentialId })
      });

      const loggedData = await loginRes.json();
      setIsLoading(false);

      if (!loginRes.ok) {
        throw new Error("Biometric credential declined verification.");
      }

      setBiometricStatus("matched");
      setTimeout(() => {
        setIsBiometricPromptOpen(false);
        setSuccessMessage("Biometric authentication verified!");
        onAuthSuccess(loggedData.user);
        onClose();
      }, 1000);

    } catch (err: any) {
      setIsLoading(false);
      setBiometricStatus("failed");
      setErrorMessage(err.message || "Passkey identification failed.");
      setTimeout(() => setIsBiometricPromptOpen(false), 2000);
    }
  };

  // SETUP MFA CODE
  const handleMfaActivationSetup = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      const data = await res.json();
      setIsLoading(false);

      if (res.ok) {
        setMfaSecret(data.secret);
        setMfaBackupCode(data.backupCode);
        switchMode("mfa-setup");
      } else {
        setErrorMessage("Could not load MFA system configs.");
      }
    } catch (e) {
      setIsLoading(false);
      setErrorMessage("MFA setup unreachable.");
    }
  };

  const handleMfaActivationConfirm = async () => {
    if (!verificationCode) {
      setErrorMessage("Please enter the 6-digit confirmation code on your screen.");
      return;
    }

    if (verificationCode !== mfaSecret && verificationCode !== "123456") {
      setErrorMessage("Invalid Code entered. Read simulated secret code again.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: mfaSecret, backupCode: mfaBackupCode })
      });

      setIsLoading(false);
      if (res.ok) {
        setSuccessMessage("MFA successfully attached & verified!");
        setTimeout(() => {
          // Refresh session
          fetch("/api/auth/session")
            .then(r => r.json())
            .then(data => {
              if (data.user) onAuthSuccess(data.user);
              onClose();
            });
        }, 1200);
      } else {
        setErrorMessage("MFA enablement update denied.");
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage("Could not complete database transaction.");
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="auth-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800/80 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Banner decorative line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-purple-600" />
        
        {/* Header bar closer */}
        <div className="flex justify-between items-center px-6 pt-5 pb-2">
          <h3 className="text-lg font-bold tracking-tight font-sans text-neutral-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            {mode === "login" && "Log In securely"}
            {mode === "register" && "Create secure account"}
            {mode === "mfa-verify" && "2FA Code Entry"}
            {mode === "mfa-setup" && "Dual Factor Setup"}
            {mode === "email-verify" && "Confirm Email Key"}
            {mode === "change-password" && "Change Password Securely"}
          </h3>
          <button 
            id="auth-modal-close"
            onClick={onClose}
            className="p-1 px-1.5 rounded-lg border border-neutral-800 bg-neutral-950/40 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contents area */}
        <div className="px-6 py-4 flex-1 overflow-y-auto space-y-5">
          {/* Messages block */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3.5 bg-red-500/10 border border-red-500/25 text-left rounded-xl text-[12px] text-red-300 flex gap-2.5 alignment-start"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-left rounded-xl text-[12px] text-emerald-300 flex gap-2.5 alignment-start"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Render loops */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-600" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-neutral-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 pl-10 pr-10 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bot validation check slider */}
              {renderBotSlider()}

              <button
                type="submit"
                disabled={isLoading || !botChecked}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:from-neutral-800 disabled:to-neutral-850 text-neutral-950 text-xs font-bold tracking-wider uppercase rounded-xl transition shadow-lg shadow-cyan-500/5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? "Authenticating security credentials..." : "Verify & Log In"}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-neutral-800/60"></div>
                <span className="flex-shrink mx-4 text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Passwordless</span>
                <div className="flex-grow border-t border-neutral-800/60"></div>
              </div>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                className="w-full py-3 border border-neutral-850 hover:bg-neutral-850/40 text-xs font-bold text-neutral-200 tracking-wider uppercase rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 text-teal-400" />
                Sign in with biometric passkey
              </button>

              <p className="text-[11px] text-center text-neutral-500 mt-2">
                Need an account?{" "}
                <button 
                  type="button" 
                  onClick={() => switchMode("register")} 
                  className="text-cyan-400 font-bold hover:underline"
                >
                  Create one now
                </button>
              </p>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-600" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  Create Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-4 h-4 text-neutral-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 pl-10 pr-10 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength dynamic checker list */}
                {password.length > 0 && (
                  <div className="mt-3 p-3 bg-neutral-950/40 border border-neutral-850/60 rounded-xl space-y-1.5 text-[11px]">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">
                      Strength Criteria
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-neutral-400">
                      <span className={`flex items-center gap-1.5 ${passRules.length ? "text-emerald-400" : "text-neutral-500"}`}>
                        {passRules.length ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Minimum 12 chars
                      </span>
                      <span className={`flex items-center gap-1.5 ${passRules.upper ? "text-emerald-400" : "text-neutral-500"}`}>
                        {passRules.upper ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Uppercase letter
                      </span>
                      <span className={`flex items-center gap-1.5 ${passRules.lower ? "text-emerald-400" : "text-neutral-500"}`}>
                        {passRules.lower ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Lowercase letter
                      </span>
                      <span className={`flex items-center gap-1.5 ${passRules.num ? "text-emerald-400" : "text-neutral-500"}`}>
                        {passRules.num ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Numeric standard
                      </span>
                      <span className={`flex items-center gap-1.5 ${passRules.sym ? "text-emerald-400" : "text-neutral-500"}`}>
                        {passRules.sym ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Special character
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Slider for anti-spam bots */}
              {renderBotSlider()}

              <button
                type="submit"
                disabled={isLoading || !botChecked || !Object.values(passRules).every(Boolean)}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 disabled:from-neutral-800 disabled:to-neutral-850 text-neutral-100 text-xs font-bold tracking-wider uppercase rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? "Encrypting authentication layers..." : "Register secure credential"}
              </button>

              <p className="text-[11px] text-center text-neutral-500 mt-2">
                Already registered?{" "}
                <button 
                  type="button" 
                  onClick={() => switchMode("login")} 
                  className="text-cyan-400 font-bold hover:underline"
                >
                  Log in now
                </button>
              </p>
            </form>
          )}

          {mode === "email-verify" && (
            <form onSubmit={handleEmailVerification} className="space-y-4">
              <div className="text-center space-y-2">
                <HelpCircle className="w-8 h-8 text-cyan-400 mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-neutral-200">Simulated Email Active Challenge</h4>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
                  To verify ownership of this email address, type the 6-digit verification code below. Since there is no real SMTP server configured in this sandboxed playground, we generated and printed your code safely in the server logs:
                </p>
                
                {/* Visual debug simulation box to bypass the SMTP server constraint honestly and helpfully */}
                <div className="my-2.5 p-3.5 bg-neutral-950 border border-cyan-500/15 rounded-xl font-mono text-center">
                  <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-1">
                    📩 Simulated Inbox Delivery
                  </p>
                  <p className="text-sm font-black text-neutral-100">
                    To: <span className="text-neutral-300 font-medium">{tempMfaUserEmail}</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Subject: Dynamic OTP Registration Code
                  </p>
                  <div className="mt-2.5 inline-block bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 px-4 py-1.5 rounded-lg text-lg font-black tracking-widest font-mono">
                    {/* Simulated code indicator: We output a helpful hint or default check code */}
                    123456
                  </div>
                  <p className="text-[9px] text-neutral-500 mt-2">
                    (Standard validation logic is active: type "123456" or check system logs)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  6-Digit Email Code
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-neutral-600" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-center font-bold font-mono text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-neutral-950 text-xs font-bold tracking-wider uppercase rounded-xl transition cursor-pointer"
              >
                {isLoading ? "Validating signature..." : "Confirm & Activate"}
              </button>
            </form>
          )}

          {mode === "mfa-verify" && (
            <form onSubmit={handleMfaVerification} className="space-y-4">
              <div className="text-center space-y-1.5">
                <Shield className="w-8 h-8 text-cyan-400 mx-auto" />
                <h4 className="text-sm font-bold text-neutral-200">Enter Multi-Factor OTP</h4>
                <p className="text-xs text-neutral-500 leading-normal">
                  Your account is protected by hardware security keys. Please provide the 6-digit code or enter your secure backup code.
                </p>
                
                {/* Helpful Sandbox hint for MFA bypass */}
                <div className="my-2 p-3 bg-neutral-950 border border-neutral-850/60 rounded-xl font-mono text-[11px]">
                  <p className="text-neutral-400">
                    💡 Simulated Dev Mode Authentication Core:
                  </p>
                  <p className="text-neutral-500 mt-1">
                    To log in safely, use "123456" as universal simulation bypass.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  Authentication PIN Code
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-neutral-600" />
                  <input
                    type="text"
                    required
                    value={mfaPin}
                    onChange={(e) => setMfaPin(e.target.value)}
                    placeholder="Enter 2FA Code or Backup recovery"
                    className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-center font-bold font-mono text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-neutral-950 text-xs font-bold tracking-wider uppercase rounded-xl transition cursor-pointer"
              >
                {isLoading ? "Authorizing MFA secure gate..." : "Confirm & Log In"}
              </button>
            </form>
          )}

          {mode === "mfa-setup" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-neutral-200 flex items-center gap-1.5 justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Dual-Factor Authenticator Setup
                </h4>
                <p className="text-xs text-neutral-400 text-center leading-relaxed">
                  Scan the security QR block or enter the manual registration parameters into Google Authenticator or Microsoft mobile protection apps.
                </p>
              </div>

              {/* Visual simulated device/manual keys box */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <span className="text-neutral-500 text-[10px]">AUTH DOMAIN:</span>
                  <span className="text-neutral-300 font-bold">EmotionalAudiobook</span>
                </div>
                
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <span className="text-neutral-500 text-[10px]">MANUAL KEY:</span>
                  <span className="text-cyan-400 font-bold tracking-wider font-mono select-all">
                    {mfaSecret}
                  </span>
                </div>

                <div className="p-2.5 bg-red-950/10 border border-red-900/20 rounded-lg text-[10px] leading-relaxed">
                  <span className="text-red-400 font-bold uppercase tracking-wider block mb-0.5">⚠️ DISASTER RECOVERY KEY:</span>
                  <span className="text-neutral-300 font-mono select-all font-semibold block bg-neutral-950 py-1 px-2 rounded mt-1 border border-neutral-850">
                    {mfaBackupCode}
                  </span>
                  <span className="text-neutral-500 block mt-1.5 leading-snug">
                    Print or save this key. If you lose your phone or security device, this key will recover your audiobook profile files immediately.
                  </span>
                </div>

                {/* Simulated visual QR graphic */}
                <div className="w-32 h-32 mx-auto bg-neutral-100 p-2.5 rounded-xl border border-neutral-850 flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-neutral-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[9px] text-center text-neutral-300 px-1 font-mono">
                    Scan with Mobile App
                  </div>
                  {/* Procedural cute qr mockup */}
                  <div className="grid grid-cols-4 gap-2 w-full h-full opacity-80">
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-200"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-200"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-200"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-200"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                    <div className="bg-neutral-200"></div>
                    <div className="bg-neutral-900 rounded-sm"></div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  Input Generated 6-digit PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder={`Use "${mfaSecret?.split("-")[1]}" or "123456" to verify`}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 px-4 text-center text-xs font-mono font-bold text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="flex-1 py-2.5 border border-neutral-850 hover:bg-neutral-850/40 text-neutral-400 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Configure Later
                </button>
                <button
                  type="button"
                  onClick={handleMfaActivationConfirm}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {isLoading ? "Locking..." : "Enable Dual-Factor"}
                </button>
              </div>
            </div>
          )}

          {mode === "change-password" && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-neutral-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Confirm current password to authorize"
                    className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 pl-10 pr-10 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 font-mono">
                  New Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 w-4 h-4 text-neutral-600" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-2.5 pl-10 pr-10 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/60 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300 transition"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength dynamic checker list */}
                {newPassword.length > 0 && (
                  <div className="mt-3 p-3 bg-neutral-950/40 border border-neutral-850/60 rounded-xl space-y-1.5 text-[11px]">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-1">
                      Strength Criteria
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-neutral-400">
                      <span className={`flex items-center gap-1.5 ${newPassRules.length ? "text-emerald-400" : "text-neutral-500"}`}>
                        {newPassRules.length ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Minimum 12 chars
                      </span>
                      <span className={`flex items-center gap-1.5 ${newPassRules.upper ? "text-emerald-400" : "text-neutral-500"}`}>
                        {newPassRules.upper ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Uppercase letter
                      </span>
                      <span className={`flex items-center gap-1.5 ${newPassRules.lower ? "text-emerald-400" : "text-neutral-500"}`}>
                        {newPassRules.lower ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Lowercase letter
                      </span>
                      <span className={`flex items-center gap-1.5 ${newPassRules.num ? "text-emerald-400" : "text-neutral-500"}`}>
                        {newPassRules.num ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Numeric standard
                      </span>
                      <span className={`flex items-center gap-1.5 ${newPassRules.sym ? "text-emerald-400" : "text-neutral-500"}`}>
                        {newPassRules.sym ? <Check className="w-3 h-3 stroke-[3px]" /> : <X className="w-3 h-3" />}
                        Special character
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Slider for anti-spam bots */}
              {renderBotSlider()}

              <button
                type="submit"
                disabled={isLoading || !botChecked || !Object.values(newPassRules).every(Boolean)}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:from-neutral-800 disabled:to-neutral-850 text-neutral-950 text-xs font-bold tracking-wider uppercase rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? "Updating secure credentials..." : "Authorize Update"}
              </button>
            </form>
          )}
          
          {/* Post-login optional Passkey setting card */}
          {passkeyEnrollSuccess && (
            <div className="my-2 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Biometric passkey successfully registered! You can now log in securely without entering your password.</span>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="bg-neutral-950/60 border-t border-neutral-900/60 px-6 py-4 flex justify-between items-center text-[10.5px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-500" />
            256-bit AES Hashed Cryptography
          </span>
          <span>SLIDING IP RATE LIMIT ACTIVE</span>
        </div>
      </motion.div>

      {/* WEB_AUTHN BIOMETRIC SIMULATOR POPUP OVERLAY */}
      <AnimatePresence>
        {isBiometricPromptOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="w-full max-w-sm bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-6 text-center space-y-6 shadow-2xl relative"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 relative">
                {biometricStatus === "scanning" && (
                  <>
                    <motion.div 
                      className="absolute inset-0 rounded-full border border-cyan-400/40"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                    />
                    <Fingerprint className="w-8 h-8 animate-pulse text-cyan-400" />
                  </>
                )}
                {biometricStatus === "matched" && (
                  <Check className="w-8 h-8 text-emerald-400 stroke-[3px]" />
                )}
                {biometricStatus === "failed" && (
                  <X className="w-8 h-8 text-red-450 stroke-[3px]" />
                )}
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white tracking-snug">
                  {biometricStatus === "scanning" && "Sign In with Passkey"}
                  {biometricStatus === "matched" && "Passkey Identity Verified!"}
                  {biometricStatus === "failed" && "Verification Failure"}
                </h4>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  {biometricStatus === "scanning" && "Touch your laptop's fingerprint sensor, look at the camera for FaceID, or use simulated WebAuthn keys."}
                  {biometricStatus === "matched" && "Authenticating session secure profiles..."}
                  {biometricStatus === "failed" && "Touch sensor scan failed. Please try again."}
                </p>
              </div>

              {biometricStatus === "scanning" && (
                <div className="flex justify-center flex-col items-center gap-2">
                  <div className="w-24 h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-cyan-400"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.8 }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 tracking-widest animate-pulse uppercase">Scanning device...</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // BOT GATE PROTECTION SLIDER RENDERER
  function renderBotSlider() {
    return (
      <div className="space-y-1.5">
        <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
          Anti-Bot Security Challenge
        </label>
        <div 
          id="bot-slider-track"
          onMouseMove={handleSliderMove}
          onTouchMove={handleSliderMove}
          className={`relative h-11 rounded-xl flex items-center justify-center font-mono text-[10px] tracking-widest font-bold uppercase transition select-none overflow-hidden ${
            botChecked 
              ? "bg-emerald-950/30 border border-emerald-500/25 text-emerald-400" 
              : "bg-neutral-950/60 border border-neutral-850/60 text-neutral-500"
          }`}
        >
          {botChecked ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Human Identity Verified
            </span>
          ) : (
            <>
              <span className="opacity-70 group-hover:opacity-100">Slide outer button to lock check</span>
              <motion.div
                id="bot-slider-thumb"
                onMouseDown={() => setIsSliding(true)}
                onTouchStart={() => setIsSliding(true)}
                style={{ left: `${sliderPosition}%` }}
                className="absolute left-1 top-1 bottom-1 w-12 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/60 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing text-cyan-400 transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.div>
            </>
          )}
        </div>
      </div>
    );
  }
}
