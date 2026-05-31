import React, { useState, useRef } from "react";
import { STORY_PRESETS } from "../data";
import { StoryPreset } from "../types";
import { Upload, FileText, BookOpen, Sparkles, ChevronRight, AlertTriangle, Info, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parsePdf, parseEpub } from "../utils/fileParser";

interface StorySelectorProps {
  selectedStory: StoryPreset | null;
  onSelectStory: (story: StoryPreset) => void;
  onCustomTextChange: (text: string, title?: string) => void;
}

export default function StorySelector({
  selectedStory,
  onSelectStory,
  onCustomTextChange,
}: StorySelectorProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "upload" | "paste">("presets");
  const [pastedText, setPastedText] = useState("");
  const [customTitle, setCustomTitle] = useState("My Novel Extract");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processUploadedFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File): Promise<void> => {
    setUploadError(null);
    setUploadWarning(null);
    setIsParsingFile(true);

    const fileName = file.name;
    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB > 15) {
      setUploadError(`The uploaded file is ${fileSizeMB.toFixed(1)} MB. Files larger than 15 MB are not supported.`);
      setIsParsingFile(false);
      return;
    }

    try {
      let extractedText = "";

      if (fileExtension === "txt") {
        extractedText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string) || "");
          reader.onerror = () => reject(new Error("An error occurred while reading the text file."));
          reader.readAsText(file);
        });
      } else if (fileExtension === "pdf") {
        extractedText = await parsePdf(file);
      } else if (fileExtension === "epub") {
        extractedText = await parseEpub(file);
      } else {
        setUploadError("Format not supported. Please upload an ebook file ending in .txt, .epub, or .pdf.");
        setIsParsingFile(false);
        return;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        setUploadError("The file was parsed successfully, but no readable plain text was found inside.");
        setIsParsingFile(false);
        return;
      }

      const words = extractedText.split(/\s+/).filter(Boolean);
      let finalizedText = extractedText;

      if (words.length > 16000) {
        // Slice the words to allow a generous chunk
        finalizedText = words.slice(0, 16000).join(" ");
        setUploadWarning(
          `This eBook has ${words.length.toLocaleString()} words. To ensure perfect voice compilation speed and respect model context guidelines, we have imported the first 16,000 words (~10-15 chapters).`
        );
      }

      const simpleTitle = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
      onCustomTextChange(finalizedText, simpleTitle);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An unexpected error occurred while parsing the eBook file.");
    } finally {
      setIsParsingFile(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    onCustomTextChange(pastedText, customTitle || "Pasted Story");
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-6 shadow-2xl overflow-hidden" id="story-selector-container">
      {/* Tabs */}
      <div className="flex border-b border-neutral-800 pb-4 mb-6 gap-2">
        <button
          id="tab-presets-btn"
          onClick={() => setActiveTab("presets")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === "presets"
              ? "bg-cyan-500/10 text-cyan-405 border border-cyan-500/20"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Preloaded Classics
        </button>
        <button
          id="tab-upload-btn"
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === "upload"
              ? "bg-cyan-500/10 text-cyan-405 border border-cyan-500/20"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Book (.txt, .epub, .pdf)
        </button>
        <button
          id="tab-paste-btn"
          onClick={() => setActiveTab("paste")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            activeTab === "paste"
              ? "bg-cyan-500/10 text-cyan-405 border border-cyan-500/20"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Paste Ebook Text
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "presets" && (
          <motion.div
            key="presets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {STORY_PRESETS.map((story) => {
              const isSelected = selectedStory?.id === story.id;
              return (
                <button
                  key={story.id}
                  id={`preset-${story.id}-btn`}
                  onClick={() => onSelectStory(story)}
                  className={`relative flex flex-col text-left rounded-xl p-5 border transition h-full text-ellipsis overflow-hidden ${
                    isSelected
                      ? "bg-neutral-800/80 border-cyan-500/80 shadow-lg shadow-cyan-500/5"
                      : "bg-neutral-950/40 border-neutral-800/50 hover:bg-neutral-800/30 hover:border-neutral-700/50"
                  }`}
                >
                  {/* Miniature Cover Preview */}
                  <div className={`w-full h-24 mb-4 rounded-lg bg-gradient-to-br ${story.coverColor} border flex flex-col justify-end p-3 relative overflow-hidden`}>
                    <div className="absolute top-1 right-2 opacity-10">
                      <BookOpen className="w-16 h-16 transform rotate-12" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-mono text-cyan-400/90 font-semibold">{story.genre}</span>
                    <h4 className="text-sm font-bold text-neutral-100 line-clamp-1">{story.title}</h4>
                    <p className="text-[10px] text-neutral-300 line-clamp-1">{story.author}</p>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h5 className="text-sm font-semibold text-neutral-200 mb-1">{story.title}</h5>
                      <p className="text-xs text-neutral-400 line-clamp-3 mb-4">{story.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800/50">
                      <span className="text-[10px] font-mono text-neutral-500">
                        ~{story.text.split(/\s+/).length} words
                      </span>
                      {isSelected && (
                        <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                          Selected <Sparkles className="w-3 h-3 fill-cyan-400/20" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}

        {activeTab === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isParsingFile && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition flex flex-col items-center justify-center min-h-[220px] ${
                isParsingFile
                  ? "border-cyan-500/30 bg-neutral-900/40 text-neutral-400 cursor-wait"
                  : dragActive
                  ? "border-cyan-400 bg-cyan-500/5 text-neutral-200 cursor-pointer"
                  : selectedStory && selectedStory.id === "custom"
                  ? "border-cyan-500/50 bg-neutral-900 text-neutral-300 cursor-pointer"
                  : "border-neutral-800 bg-neutral-950/20 hover:bg-neutral-800/10 text-neutral-400 hover:text-neutral-200 cursor-pointer"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.epub,.pdf"
                onChange={handleFileInputChange}
                disabled={isParsingFile}
                className="hidden"
              />
              
              {isParsingFile ? (
                <div className="flex flex-col items-center py-6">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  </div>
                  <h4 className="text-base font-bold text-neutral-100 mb-1">
                    Extracting Ebook Contents...
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-sm mt-1">
                    Converting document pages, parsing tables & formatting chapters into a polished read-along manuscript.
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4 border border-neutral-700/50">
                    <Upload className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>

                  {selectedStory && selectedStory.id === "custom" ? (
                    <div>
                      <h4 className="text-base font-bold text-cyan-400 mb-1">
                        📖 "{selectedStory.title}" Loaded Successfully!
                      </h4>
                      <p className="text-xs text-neutral-400 mb-3">
                        ~{selectedStory.text.split(/\s+/).filter(Boolean).length.toLocaleString()} words parsed
                      </p>
                      <span className="text-[11px] bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full border border-neutral-700/50">
                        Click or Drop to Replace File
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold mb-1 text-neutral-300">
                        Drag and drop your eBook file (.txt, .epub, .pdf) here
                      </p>
                      <p className="text-xs text-neutral-500 mb-4">
                        Or click to browse files (Up to 15MB) from your computer
                      </p>
                      <span className="text-[11px] bg-neutral-800 text-neutral-400 px-3 py-1.5 rounded-md border border-neutral-700/30">
                        Ebook chapters will be extracted and formatted page-by-page.
                      </span>
                    </div>
                  )}
                </>
              )}

              {uploadError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left text-xs text-red-300 flex gap-2.5 max-w-md">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadWarning && (
                <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-left text-xs text-cyan-300 flex gap-2.5 max-w-md">
                  <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>{uploadWarning}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "paste" && (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Ebook Title / Label
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="My Novel Scene"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Paste Novel / Chapter Text Here
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste any scene, script, or dialogue from your favorite novel or epic fantasy..."
                  rows={5}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/45 resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                id="apply-pasted-text-btn"
                disabled={!pastedText.trim()}
                onClick={handlePasteSubmit}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-neutral-950 text-sm font-semibold rounded-lg transition"
              >
                Apply Text Content
                <ChevronRight className="w-4 h-4 text-neutral-950" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Box Indicator */}
      {selectedStory && (
        <div className="mt-6 flex items-center justify-between p-4 bg-neutral-950 rounded-xl border border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold">
                {selectedStory.id === "custom" ? "Custom Text File" : selectedStory.genre}
              </span>
              <h5 className="text-sm font-bold text-neutral-100">{selectedStory.title}</h5>
            </div>
          </div>
          <div className="text-right text-xs font-mono text-neutral-500 bg-neutral-900 border border-neutral-800 rounded px-2 py-1">
            Word count: {selectedStory.text.split(/\s+/).filter(Boolean).length}
          </div>
        </div>
      )}
    </div>
  );
}
