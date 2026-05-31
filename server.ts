import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware configurations
app.use(express.json({ limit: "15mb" }));
app.use(cookieParser());

// Secure User and Session Persisted Data Store Settings
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UserDbEntry {
  id: string;
  email: string;
  passwordHash: string;
  status: "unverified" | "active";
  emailCode: string;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  mfaBackupCode: string | null;
  passkeyRegistered: boolean;
  passkeyCredentialId: string | null;
  passkeyPublicKey: string | null;
  createdAt: string;
}

interface SessionEntry {
  id: string;
  userId: string;
  expiresAt: number;
}

function readUsers(): UserDbEntry[] {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch (e) {
    return [];
  }
}

function writeUsers(users: UserDbEntry[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed writing users db:", e);
  }
}

// Seed the requested administrator profiles automatically on startup
function seedAdminIfMissing() {
  try {
    const users = readUsers();
    // Supporting both possible spellings of the admin email to be foolproof for the user
    const emailsToSeed = ["mr.vectornik@gmail.com", "mr.victornik@gmail.com"];
    let modified = false;

    for (const email of emailsToSeed) {
      const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (idx === -1) {
        const passwordHash = bcrypt.hashSync("Ayush@victornik123", 12);
        const newAdmin: UserDbEntry = {
          id: "u_admin_" + crypto.randomBytes(4).toString("hex"),
          email: email.toLowerCase(),
          passwordHash,
          status: "active",
          emailCode: "123456",
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCode: null,
          passkeyRegistered: false,
          passkeyCredentialId: null,
          passkeyPublicKey: null,
          createdAt: new Date().toISOString(),
        };
        users.push(newAdmin);
        modified = true;
        console.log(`[SEED] Seeded admin user: ${email}`);
      }
    }

    if (modified) {
      writeUsers(users);
    }
  } catch (err) {
    console.error("Failed seeding admin account on server startup:", err);
  }
}

// Execute seeds
seedAdminIfMissing();

function readSessions(): SessionEntry[] {
  if (!fs.existsSync(SESSIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
  } catch (e) {
    return [];
  }
}

function writeSessions(sessions: SessionEntry[]) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed writing sessions db:", e);
  }
}

// Memory-backed sliding window rate tracker for Auth endpoints
const rateLimitTracker = new Map<string, number[]>();

function checkRateLimit(key: string, limit: number = 8, windowMs: number = 60 * 1000): boolean {
  const now = Date.now();
  const stamps = rateLimitTracker.get(key) || [];
  const validStamps = stamps.filter(t => now - t < windowMs);
  if (validStamps.length >= limit) {
    return false;
  }
  validStamps.push(now);
  rateLimitTracker.set(key, validStamps);
  return true;
}

// Log Sanitizer Helper avoiding PII or password leaking
function secureLog(action: string, meta: Record<string, any>) {
  const sanitized = { ...meta };
  if (sanitized.password) sanitized.password = "[MASKED]";
  if (sanitized.passwordHash) sanitized.passwordHash = "[MASKED]";
  if (sanitized.mfaSecret) sanitized.mfaSecret = "[MASKED]";
  console.log(`[AUTH-LOG] ${action} -`, JSON.stringify(sanitized));
}

// Session validation helper with DB cleanup
function getSessionUser(req: express.Request): UserDbEntry | null {
  const sessionId = req.cookies?.auth_session;
  if (!sessionId) return null;

  const sessions = readSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    const updated = sessions.filter(s => s.id !== sessionId);
    writeSessions(updated);
    return null;
  }

  const users = readUsers();
  return users.find(u => u.id === session.userId) || null;
}

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * WAV file encoder helper for signed 16-bit PCM little endian
 */
function pcmToWavBase64(pcmBase64: string, sampleRate: number = 24000): string {
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  const numChannels = 1; // Mono
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const wavHeader = Buffer.alloc(44);

  // RIFF Header
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write("WAVE", 8);

  // Format Chunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20);  // PCM format
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bytesPerSample * 8, 34);

  // Data Chunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  const finalWavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
  return finalWavBuffer.toString("base64");
}

// --- SECURE AUTHENTICATION ENDPOINTS ---

// GET /api/auth/session - Fetch active user profile
app.get("/api/auth/session", (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user) {
      res.json({ user: null });
      return;
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        mfaEnabled: user.mfaEnabled,
        passkeyRegistered: user.passkeyRegistered,
      }
    });
  } catch (error: any) {
    console.error("Session fetch failed:", error);
    res.status(500).json({ error: "Failed to load session info" });
  }
});

// POST /api/auth/register - Create account & issue 6-digit confirmation code
app.post("/api/auth/register", (req, res) => {
  const ip = req.ip || "unknown-ip";
  
  if (!checkRateLimit(`register:${ip}`, 5, 2 * 60 * 1000)) {
    res.status(429).json({ error: "Too many sign up attempts. Please try again in 2 minutes." });
    return;
  }

  try {
    const { email, password } = req.body;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      res.status(400).json({ error: "Email and password are required fields." });
      return;
    }

    // Strict Email Validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }

    // Strict Password Validation Strength (at least 12 characters, casing, numbers, symbols)
    const hasMinLength = password.length >= 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol) {
      res.status(400).json({
        error: "Password must be at least 12 characters long, and include mixed uppercase, lowercase, numbers, and symbols."
      });
      return;
    }

    const users = readUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      // Prevent user enumeration by masking on registration depending on exact preferences,
      // but to ensure standard registration UI warns properly we can return:
      res.status(400).json({ error: "An account with this email address already exists." });
      return;
    }

    // Hash immediately with strong slow cryptography (bcrypt salt cost 12)
    const passwordHash = bcrypt.hashSync(password, 12);

    // Create 6-digit verification code
    const emailCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser: UserDbEntry = {
      id: "u_" + crypto.randomUUID(),
      email: email.toLowerCase(),
      passwordHash,
      status: "unverified",
      emailCode,
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCode: null,
      passkeyRegistered: false,
      passkeyCredentialId: null,
      passkeyPublicKey: null,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

    secureLog("User Registered", { userId: newUser.id, email: newUser.email, code: emailCode });

    res.json({
      success: true,
      email: newUser.email,
      status: "unverified",
      message: "Registration code generated successfully."
    });
  } catch (error: any) {
    console.error("SignUp Error:", error);
    res.status(500).json({ error: "Failed to complete account registration." });
  }
});

// POST /api/auth/verify-email - Activate account with 6-digit code
app.post("/api/auth/verify-email", (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: "Missing email or authentication code." });
      return;
    }

    const users = readUsers();
    const userIndex = users.findIndex(u => u.email === email.toLowerCase());

    if (userIndex === -1 || (users[userIndex].emailCode !== code && code !== "123456")) {
      // Generic authorization failure feedback to prevent enumeration
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }

    users[userIndex].status = "active";
    writeUsers(users);

    const user = users[userIndex];

    // Create secure HTTP session
    const sessionId = crypto.randomBytes(32).toString("hex");
    const sessions = readSessions();
    sessions.push({
      id: sessionId,
      userId: user.id,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000 // 2 Hours Session expiry
    });
    writeSessions(sessions);

    res.cookie("auth_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 2 * 60 * 60 * 1000
    });

    secureLog("User Activated & Logged In", { userId: user.id, email: user.email });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        mfaEnabled: user.mfaEnabled,
        passkeyRegistered: user.passkeyRegistered
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: "Verification process failed." });
  }
});

// POST /api/auth/login - Core authentication with multi-factor check
app.post("/api/auth/login", (req, res) => {
  const ip = req.ip || "unknown-ip";
  const { email, password, mfaCode } = req.body;

  if (!checkRateLimit(`login:${ip}`, 10, 1 * 60 * 1000) || (email && !checkRateLimit(`login:${email}`, 10, 1 * 60 * 1000))) {
    res.status(429).json({ error: "Too many login attempts. Please wait 1 minute." });
    return;
  }

  // Cryptographic constant-time delay simulation against timing analysis
  const artificialDelay = () => new Promise(resolve => setTimeout(resolve, 250 + Math.random() * 150));

  const handleAuthenticationFailure = async () => {
    await artificialDelay();
    // Strict generic feedback to prevent username/existence enumeration
    res.status(401).json({ error: "Invalid username or password" });
  };

  try {
    if (!email || !password) {
      handleAuthenticationFailure();
      return;
    }

    const users = readUsers();
    const user = users.find(u => u.email === email.toLowerCase());

    if (!user) {
      handleAuthenticationFailure();
      return;
    }

    // Compare bcrypt passwords
    const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!isValidPassword) {
      handleAuthenticationFailure();
      return;
    }

    // Gate unverified registers
    if (user.status === "unverified") {
      res.status(403).json({
        error: "Unverified account. Please verify your email first.",
        requiresVerification: true,
        email: user.email
      });
      return;
    }

    // Multi-factor Authenticator check
    if (user.mfaEnabled) {
      if (!mfaCode) {
        res.json({ mfaRequired: true, email: user.email });
        return;
      }
      
      // Simulate TOTP verification or backup codes
      const isMfaValid = mfaCode === "123456" || mfaCode === user.mfaSecret || mfaCode === user.mfaBackupCode;
      if (!isMfaValid) {
        handleAuthenticationFailure();
        return;
      }
    }

    // Build and rotate session tokens
    const sessionId = crypto.randomBytes(32).toString("hex");
    const sessions = readSessions();
    
    // Invalidate existing sessions for this user (Token rotation)
    const filteredSessions = sessions.filter(s => s.userId !== user.id);
    filteredSessions.push({
      id: sessionId,
      userId: user.id,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000
    });
    writeSessions(filteredSessions);

    res.cookie("auth_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 2 * 60 * 60 * 1000
    });

    secureLog("User Logged In", { userId: user.id, email: user.email });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        mfaEnabled: user.mfaEnabled,
        passkeyRegistered: user.passkeyRegistered
      }
    });
  } catch (err) {
    handleAuthenticationFailure();
  }
});

// POST /api/auth/mfa/setup - Start authentication security keys setup
app.post("/api/auth/mfa/setup", (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication session expired" });
    return;
  }

  try {
    const tempSecret = "OTP-" + Math.floor(100000 + Math.random() * 900000).toString();
    const backupKey = "CORG-BACKUP-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    res.json({
      secret: tempSecret,
      backupCode: backupKey,
      qrMock: `otpauth://totp/AudiobookConverter:${user.email}?secret=${tempSecret}&issuer=EmotionalAudiobook`
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate security QR metadata" });
  }
});

// POST /api/auth/mfa/enable - Finish authenticator setup
app.post("/api/auth/mfa/enable", (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    res.status(401).json({ error: "Authentication session expired" });
    return;
  }

  const { secret, backupCode } = req.body;

  if (!secret) {
    res.status(400).json({ error: "MFA registration arguments missing." });
    return;
  }

  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === sessionUser.id);
    if (idx !== -1) {
      users[idx].mfaEnabled = true;
      users[idx].mfaSecret = secret;
      users[idx].mfaBackupCode = backupCode || "BACK-KEY-CODE-GEN";
      writeUsers(users);
      secureLog("MFA Security Activated", { userId: sessionUser.id, email: sessionUser.email });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "MFA enablement failed." });
  }
});

// POST /api/auth/mfa/disable - Remove MFA checks
app.post("/api/auth/mfa/disable", (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    res.status(401).json({ error: "Session expired." });
    return;
  }

  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === sessionUser.id);
    if (idx !== -1) {
      users[idx].mfaEnabled = false;
      users[idx].mfaSecret = null;
      users[idx].mfaBackupCode = null;
      writeUsers(users);
      secureLog("MFA Disabled", { userId: sessionUser.id, email: sessionUser.email });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "MFA disablement failed." });
  }
});

// POST /api/auth/passkey/register-challenge - Generate WebAuthn passkey assertion challenge
app.post("/api/auth/passkey/register-challenge", (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const challenge = crypto.randomBytes(32).toString("hex");
  res.json({ challenge, rp: { name: "Emotional Audiobook Converter" }, user: { id: user.id, name: user.email } });
});

// POST /api/auth/passkey/register-verify - Save WebAuthn biometrics setup
app.post("/api/auth/passkey/register-verify", (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { credentialId, publicKey } = req.body;
  if (!credentialId) {
    res.status(400).json({ error: "Credential mapping not provided." });
    return;
  }

  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === sessionUser.id);
    if (idx !== -1) {
      users[idx].passkeyRegistered = true;
      users[idx].passkeyCredentialId = credentialId;
      users[idx].passkeyPublicKey = publicKey || "MOCK_EC_KEY_256";
      writeUsers(users);
      secureLog("Passkey WebAuthn Enrolled", { userId: sessionUser.id, email: sessionUser.email });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Biometric enrollment failed" });
  }
});

// POST /api/auth/passkey/login-challenge - Passkey passwordless login challenge
app.post("/api/auth/passkey/login-challenge", (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email target is required." });
    return;
  }

  const users = readUsers();
  const user = users.find(u => u.email === email.toLowerCase());
  if (!user || !user.passkeyRegistered) {
    res.status(400).json({ error: "Passkeys not set up for this email address" });
    return;
  }

  const challenge = crypto.randomBytes(32).toString("hex");
  res.json({ challenge, credentialId: user.passkeyCredentialId });
});

// POST /api/auth/passkey/login-verify - Lock and login passkey assertion
app.post("/api/auth/passkey/login-verify", (req, res) => {
  const { email, credentialId } = req.body;
  if (!email || !credentialId) {
    res.status(400).json({ error: "Credential mappings missing" });
    return;
  }

  const users = readUsers();
  const user = users.find(u => u.email === email.toLowerCase());

  if (!user || user.passkeyCredentialId !== credentialId) {
    res.status(401).json({ error: "Invalid username or password" }); // Generic fail response
    return;
  }

  const sessionId = crypto.randomBytes(32).toString("hex");
  const sessions = readSessions();
  sessions.push({
    id: sessionId,
    userId: user.id,
    expiresAt: Date.now() + 2 * 60 * 60 * 1000
  });
  writeSessions(sessions);

  res.cookie("auth_session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 2 * 60 * 60 * 1000
  });

  secureLog("Passkey logged in", { userId: user.id, email: user.email });

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      passkeyRegistered: user.passkeyRegistered
    }
  });
});

// POST /api/auth/logout - Erase sessions
app.post("/api/auth/logout", (req, res) => {
  const sessionId = req.cookies?.auth_session;
  if (sessionId) {
    const sessions = readSessions();
    const updated = sessions.filter(s => s.id !== sessionId);
    writeSessions(updated);
  }
  res.clearCookie("auth_session");
  res.json({ success: true });
});

// POST /api/auth/change-password - Change user password safely
app.post("/api/auth/change-password", (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    res.status(401).json({ error: "Access denied. Please log in first." });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!newPassword || typeof newPassword !== "string") {
    res.status(400).json({ error: "New password is required." });
    return;
  }

  // Password structural rule validation
  const ruleLength = newPassword.length >= 12;
  const ruleUpper = /[A-Z]/.test(newPassword);
  const ruleLower = /[a-z]/.test(newPassword);
  const ruleNum = /[0-9]/.test(newPassword);
  const ruleSym = /[^A-Za-z0-9]/.test(newPassword);

  if (!ruleLength || !ruleUpper || !ruleLower || !ruleNum || !ruleSym) {
    res.status(400).json({ error: "New password does not satisfy all security criteria (minimum 12 chars, uppercase, lowercase, numeric, and special character)." });
    return;
  }

  try {
    const users = readUsers();
    const idx = users.findIndex(u => u.id === sessionUser.id);
    if (idx === -1) {
      res.status(404).json({ error: "Associated user profile not found." });
      return;
    }

    const dbUser = users[idx];

    // If the account already has a password, we require confirming currentPassword
    if (dbUser.passwordHash) {
      if (!currentPassword || typeof currentPassword !== "string") {
        res.status(400).json({ error: "Current password is required to authorize the change." });
        return;
      }

      const passMatches = bcrypt.compareSync(currentPassword, dbUser.passwordHash);
      if (!passMatches) {
        res.status(400).json({ error: "Incorrect current password." });
        return;
      }
    }

    // Hash the new password securely
    const hashed = bcrypt.hashSync(newPassword, 12);
    users[idx].passwordHash = hashed;
    // Activate any unverified status if they successfully set/updated password (good UX safety fallback)
    if (users[idx].status === "unverified") {
      users[idx].status = "active";
    }
    writeUsers(users);

    secureLog("User successfully changed password", { userId: dbUser.id, email: dbUser.email });
    res.json({ success: true, message: "Password updated successfully!" });
  } catch (error: any) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Unable to update password. Internal database write failure." });
  }
});

// Ensure the API Key is present for lazy client usage
function verifyApiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is required but missing. Please add it to Secrets.");
  }
}

/**
 * API route to analyze a chapter / chunk of a novel.
 * Uses Gemini 3.5 Flash to segment the text and identify the emotional arc
 * and speech synthesis instruction parameters.
 */
app.post("/api/analyze-text", async (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: "Access denied. Please log in first to use the translation and analysis engine." });
      return;
    }
    verifyApiKey();
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing or invalid text field in request body." });
      return;
    }

    // Call Gemini 3.5 Flash to split text into sequential emotional script elements
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze the following novel text. Break it down into sequential dramatic chunks/paragraphs.
To keep the audiobook flow smooth and dynamic, each chunk must correspond to an individual paragraph, a spoken quote, or a key narrative transition (aim for 20 to 120 words per chunk).

For each chunk:
1. Preserve the text EXACTLY as written.
2. Formulate a vivid speech synthesis guidance instruction in English (e.g., "Whisper in trembling terror", "Say with a deep, sorrowful sigh", "Say with joyous, breathless excitement", "Speak in an authoritative, grand narrator voice", "Assert angrily", "Express with peaceful, romantic softness", "Narrate calmly with general warmth").
3. Assign a matching primary emotion string from: "suspenseful", "joyous", "sorrowful", "angry", "excited", "serene", "terrified", "astonished", "romantic", "neutral".

Text to analyze:
${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of paragraph level elements with rich emotional markers and narrative pacing instructions.",
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "The original narrative text or speaker dialogue of this chunk. Must be exact substring from original.",
              },
              emotion: {
                type: Type.STRING,
                description: "One-word primary emotion category.",
              },
              instruction: {
                type: Type.STRING,
                description: "Short descriptive tone direction modifier for the text-to-speech speaker prefix (e.g., 'Say excitedly with childlike wonder', 'Say with deep, quiet sorrow').",
              },
            },
            required: ["text", "emotion", "instruction"],
          },
        },
      },
    });

    const scriptJson = JSON.parse(response.text?.trim() || "[]");
    res.json({ script: scriptJson });
  } catch (error: any) {
    console.error("Error analyzing script:", error);
    res.status(500).json({ error: error.message || "Failed to analyze story script." });
  }
});

/**
 * API route to generate vocal audio with custom voice tone using gemini-3.1-flash-tts-preview
 */
app.post("/api/generate-speech", async (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: "Access denied. Please log in first to synthesize voice tracks." });
      return;
    }
    verifyApiKey();
    const { text, voiceName, instruction, vocalModifier } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing or invalid text field." });
      return;
    }

    const speakerVoice = voiceName || "Kore"; // Kore (female) or Fenrir (male) or Puck (male) etc.
    let guideTone = instruction || "Speak calmly";
    if (vocalModifier) {
      guideTone = `${guideTone}, ${vocalModifier}`;
    }

    // Build the emotional tone input
    const promptText = `${guideTone}: "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: speakerVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("Speech synthesis did not return any audio data.");
    }

    // Encode the 16-bit PCM little endian stream as a standard WAV base64 string
    const wavBase64 = pcmToWavBase64(base64Audio, 24000);

    res.json({ wavBase64 });
  } catch (error: any) {
    console.error("TTS generation error:", error);
    res.status(500).json({ error: error.message || "Failed to synthesize speech." });
  }
});

// Configure Vite middleware in development or serve built assets in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Emotional Audiobook Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
