import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Send, Sparkles, ArrowRight,
  LayoutDashboard, Loader2, Plus,
  Paperclip, FileText, X,
} from 'lucide-react';
import * as api from '../services/api';
import { collectAnalysisContent } from '../utils/fileUtils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface CreativeModeProps {
  onSwitchToWorkspace: () => void;
  onStartProduction: (conversationContext: string) => void;
}

const READY_MARKER = '<<READY>>';

const CREATIVE_SYSTEM_PROMPT = `You are a creative audio producer working inside "Gather", a professional audio production studio. Your role is to help users brainstorm, shape, and refine their audio content ideas — podcasts, audiobooks, meditations, educational series, etc.

Guidelines:
- Be conversational, warm, and encouraging — NOT formal
- Ask clarifying questions one or two at a time, don't overwhelm
- Help users develop: topic, target audience, tone/style, structure, speaker/character ideas
- When the user provides raw text or a script, help them refine it for audio
- Suggest creative angles they might not have considered
- Keep responses concise (2-4 short paragraphs max)
- Respond in the SAME LANGUAGE the user writes in

IMPORTANT — Production readiness signal:
When you believe the conversation has gathered enough information to start production (i.e. the core topic, general direction, and at least some sense of audience or tone are established), append the EXACT marker <<READY>> at the very end of your response (after all visible text). This marker is hidden from the user and used by the system to enable the "Start Production" button. Only include it when there is genuinely enough context to produce something meaningful. Do NOT include it if the user has only said hello or the idea is still too vague.`;

function buildChatPrompt(messages: ChatMessage[]): string {
  let prompt = CREATIVE_SYSTEM_PROMPT + '\n\n';
  for (const msg of messages) {
    if (msg.role === 'user') {
      prompt += `User: ${msg.content}\n\n`;
    } else {
      prompt += `Assistant: ${msg.content}\n\n`;
    }
  }
  prompt += 'Assistant:';
  return prompt;
}

export function buildConversationSummary(messages: ChatMessage[]): string {
  return messages
    .map(m => `${m.role === 'user' ? 'User' : 'Producer'}: ${m.content}`)
    .join('\n\n');
}

export function CreativeMode({ onSwitchToWorkspace, onStartProduction }: CreativeModeProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const ct = t.creativeMode;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [readyForProduction, setReadyForProduction] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    const hasFiles = uploadedFiles.length > 0;
    if ((!content && !hasFiles) || isStreaming) return;

    const filesToSend = [...uploadedFiles];
    let displayContent = content;
    if (filesToSend.length > 0) {
      const fileNames = filesToSend.map(f => f.name).join(', ');
      displayContent = content
        ? `${content}\n\n📎 ${fileNames}`
        : `📎 ${fileNames}`;
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: displayContent,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setUploadedFiles([]);
    setIsStreaming(true);
    setStreamingContent('');
    abortRef.current = false;

    try {
      let attachments: api.FileAttachment[] | undefined;
      let promptText = content;

      if (filesToSend.length > 0) {
        const collected = await collectAnalysisContent(content, filesToSend, { returnAttachments: true });
        promptText = collected.text;
        attachments = collected.attachments.length > 0 ? collected.attachments : undefined;
      }

      const prompt = buildChatPrompt([
        ...updatedMessages.slice(0, -1),
        { ...userMsg, content: promptText },
      ]);
      let accumulated = '';

      await api.generateTextStream(
        prompt,
        (chunk) => {
          if (abortRef.current) return;
          accumulated = chunk.accumulated;
          setStreamingContent(accumulated.replace(READY_MARKER, '').trimEnd());
        },
        { temperature: 0.8, maxTokens: 1024, attachments }
      );

      if (!abortRef.current) {
        const hasReadyMarker = accumulated.includes(READY_MARKER);
        const cleanContent = accumulated.replace(READY_MARKER, '').trimEnd();

        if (hasReadyMarker) {
          setReadyForProduction(true);
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: cleanContent,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error('Creative chat error:', err);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t.common.error + ': ' + (err instanceof Error ? err.message : String(err)),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [input, isStreaming, messages, uploadedFiles, t.common.error]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleNewChat = () => {
    abortRef.current = true;
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
    setInput('');
    setUploadedFiles([]);
    setReadyForProduction(false);
    inputRef.current?.focus();
  };

  const handleStartProduction = () => {
    const summary = buildConversationSummary(messages);
    onStartProduction(summary);
  };

  const hasMessages = messages.length > 0;
  const canStartProduction = readyForProduction;

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--t-bg)' }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.07]"
          style={{ background: theme.primary }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-t-border-lt backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${theme.primary}20` }}
          >
            <Sparkles size={16} color={theme.primaryLight} />
          </div>
          <h1 className="text-sm font-medium text-t-text1 tracking-wide">{ct.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {hasMessages && (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-t-text3 hover:text-t-text2 hover:bg-t-card transition-all"
            >
              <Plus size={14} />
              {ct.newChat}
            </button>
          )}
          <button
            onClick={onSwitchToWorkspace}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-t-text3 hover:text-t-text2 hover:bg-t-card transition-all"
          >
            <LayoutDashboard size={14} />
            {ct.switchToWorkspace}
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          {!hasMessages ? (
            /* Empty state — greeting + starters */
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}30, ${theme.primary}10)`,
                  boxShadow: `0 0 40px ${theme.glow}`,
                }}
              >
                <Sparkles size={28} color={theme.primaryLight} />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-light text-t-text1 tracking-wide text-center mb-3">
                {ct.title}
              </h2>
              <p className="text-t-text3 text-sm sm:text-base text-center max-w-md leading-relaxed mb-8">
                {ct.greeting}
              </p>

              {/* Suggested starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {(ct.suggestedStarters as unknown as string[]).map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(starter)}
                    className="text-left px-4 py-3 rounded-xl border border-t-border-lt text-sm text-t-text2 hover:text-t-text1 hover:border-t-border transition-all duration-200"
                    style={{ background: 'var(--t-bg-card)' }}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-white rounded-br-md'
                        : 'text-t-text1 border border-t-border-lt rounded-bl-md'
                    }`}
                    style={
                      msg.role === 'user'
                        ? { background: theme.primary }
                        : { background: 'var(--t-bg-card)' }
                    }
                  >
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}

              {/* Streaming bubble */}
              {isStreaming && (
                <div className="flex justify-start">
                  <div
                    className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed text-t-text1 border border-t-border-lt"
                    style={{ background: 'var(--t-bg-card)' }}
                  >
                    {streamingContent ? (
                      <MessageContent content={streamingContent} />
                    ) : (
                      <div className="flex items-center gap-2 text-t-text3">
                        <Loader2 size={14} className="animate-spin" />
                        <span>{ct.thinking}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — input + actions */}
      <div className="relative z-10 border-t border-t-border-lt backdrop-blur-xl" style={{ background: 'var(--t-bg-base)' }}>
        {/* Start production CTA */}
        {canStartProduction && !isStreaming && (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-3">
            <button
              onClick={handleStartProduction}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`,
                color: '#fff',
              }}
            >
              <ArrowRight size={16} />
              {ct.startProduction}
            </button>
            <p className="text-center text-[10px] text-t-text3 mt-1.5 mb-1">{ct.startProductionHint}</p>
          </div>
        )}

        {/* Input area */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Attached file tags */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {uploadedFiles.map((file, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-t-border-lt"
                  style={{ background: `${theme.primary}10`, color: theme.primaryLight }}
                >
                  <FileText size={12} />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="hover:text-red-400 transition-colors ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div
            className="flex items-end gap-2 rounded-xl border border-t-border-lt px-3 py-2 transition-all focus-within:border-t-border"
            style={{ background: 'var(--t-bg-card)' }}
          >
            {/* File upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-t-text3 hover:text-t-text2 hover:bg-t-card-hover transition-all disabled:opacity-30"
              title="Upload file"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ct.inputPlaceholder}
              rows={1}
              className="flex-1 bg-transparent text-sm text-t-text1 placeholder-t-text3 resize-none outline-none min-h-[24px] max-h-[120px] leading-relaxed"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              disabled={isStreaming}
            />
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && uploadedFiles.length === 0) || isStreaming}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                background: (input.trim() || uploadedFiles.length > 0) ? theme.primary : 'transparent',
                color: (input.trim() || uploadedFiles.length > 0) ? '#fff' : 'var(--t-text-3)',
              }}
            >
              {isStreaming ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const paragraphs = content.split('\n\n').filter(Boolean);
  if (paragraphs.length <= 1) {
    return <>{content.split('\n').map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </span>
    ))}</>;
  }
  return (
    <div className="space-y-2">
      {paragraphs.map((p, i) => (
        <p key={i}>
          {p.split('\n').map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
