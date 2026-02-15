import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyTickets,
  createTicket,
  getTicketDetail,
  sendTicketMessage,
  closeTicket,
  FeedbackTicket,
  FeedbackMessage,
} from '../services/api';
import {
  Plus,
  ArrowLeft,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';

type View = 'list' | 'create' | 'chat';

const STATUS_COLORS: Record<string, string> = {
  open: '#f59e0b',
  in_progress: '#3b82f6',
  resolved: '#22c55e',
  closed: '#6b7280',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
};

export function FeedbackPanel() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [view, setView] = useState<View>('list');
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('question');
  const [priority, setPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  // Chat input
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fb = t.feedback;

  // Load tickets
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyTickets();
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Load ticket detail
  const openTicket = async (ticket: FeedbackTicket) => {
    try {
      setSelectedTicket(ticket);
      setView('chat');
      setLoading(true);
      const data = await getTicketDetail(ticket.id);
      setSelectedTicket(data.ticket);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load ticket:', err);
      setError('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create ticket
  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    try {
      setCreating(true);
      const ticket = await createTicket({
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
      });
      setSubject('');
      setMessage('');
      setCategory('question');
      setPriority('medium');
      await loadTickets();
      openTicket(ticket);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedTicket) return;
    try {
      setSending(true);
      const msg = await sendTicketMessage(selectedTicket.id, chatInput.trim());
      setMessages(prev => [...prev, msg]);
      setChatInput('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  // Close ticket
  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      const updated = await closeTicket(selectedTicket.id);
      setSelectedTicket(updated);
      loadTickets();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const goBack = () => {
    if (view === 'chat' || view === 'create') {
      setView('list');
      setSelectedTicket(null);
      setMessages([]);
      setError(null);
      loadTickets();
    }
  };

  // ---- Render ----

  const renderTicketList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-t-border-lt">
        <div>
          <h2 className="text-xl font-serif text-t-text1">{fb.title}</h2>
          <p className="text-sm text-t-text3 mt-0.5">{fb.subtitle}</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: `${theme.primary}20`,
            color: theme.primaryLight,
          }}
        >
          <Plus size={16} />
          {fb.newTicket}
        </button>
      </div>

      {/* Ticket list */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-t-text3" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare size={48} className="text-t-text3 opacity-30 mb-4" />
            <p className="text-t-text2 font-medium">{fb.noTickets}</p>
            <p className="text-sm text-t-text3 mt-1">{fb.noTicketsDesc}</p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const StatusIcon = STATUS_ICONS[ticket.status] || AlertCircle;
            return (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className="w-full text-left p-4 rounded-xl border border-t-border-lt hover:border-t-border transition-all duration-200 bg-t-card hover:bg-t-card-hover group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon
                        size={14}
                        style={{ color: STATUS_COLORS[ticket.status] }}
                      />
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: `${STATUS_COLORS[ticket.status]}20`,
                          color: STATUS_COLORS[ticket.status],
                        }}
                      >
                        {fb.status[ticket.status as keyof typeof fb.status]}
                      </span>
                      {ticket.category && (
                        <span className="text-xs text-t-text3">
                          {fb.categories[ticket.category as keyof typeof fb.categories] || ticket.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-t-text1 truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-t-text3 mt-1">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {ticket.unreadCount > 0 && (
                    <span
                      className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ background: theme.primary }}
                    >
                      {ticket.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderCreateForm = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-t-border-lt">
        <button
          onClick={goBack}
          className="p-1.5 rounded-lg hover:bg-t-card transition-colors"
        >
          <ArrowLeft size={18} className="text-t-text3" />
        </button>
        <h2 className="text-lg font-serif text-t-text1">{fb.newTicket}</h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-t-text2 mb-1.5">{fb.subject}</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={fb.subjectPlaceholder}
            className="w-full px-4 py-2.5 rounded-xl border border-t-border-lt bg-t-card text-t-text1 text-sm placeholder:text-t-text3 focus:outline-none focus:border-t-border transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-t-text2 mb-1.5">{fb.category}</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-t-border-lt bg-t-card text-t-text1 text-sm appearance-none focus:outline-none focus:border-t-border transition-colors"
            >
              {Object.entries(fb.categories).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-text3 pointer-events-none" />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-t-text2 mb-1.5">{fb.priority}</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  priority === p
                    ? 'border-t-border text-t-text1 bg-t-card-hover'
                    : 'border-t-border-lt text-t-text3 hover:text-t-text2'
                }`}
              >
                {fb.priorities[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-t-text2 mb-1.5">{fb.message}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={fb.messagePlaceholder}
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-t-border-lt bg-t-card text-t-text1 text-sm placeholder:text-t-text3 focus:outline-none focus:border-t-border transition-colors resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>

      {/* Submit */}
      <div className="px-6 py-4 border-t border-t-border-lt">
        <button
          onClick={handleCreateTicket}
          disabled={creating || !subject.trim() || !message.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
          style={{ background: theme.primary }}
        >
          {creating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {fb.creating}
            </span>
          ) : (
            fb.createTicket
          )}
        </button>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-t-border-lt">
        <button
          onClick={goBack}
          className="p-1.5 rounded-lg hover:bg-t-card transition-colors"
        >
          <ArrowLeft size={18} className="text-t-text3" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-t-text1 truncate">
            {selectedTicket?.subject}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {selectedTicket && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${STATUS_COLORS[selectedTicket.status]}20`,
                  color: STATUS_COLORS[selectedTicket.status],
                }}
              >
                {fb.status[selectedTicket.status as keyof typeof fb.status]}
              </span>
            )}
          </div>
        </div>
        {selectedTicket && selectedTicket.status !== 'closed' && (
          <button
            onClick={handleCloseTicket}
            className="text-xs text-t-text3 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
          >
            {fb.closeTicket}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-t-text3" />
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? 'rounded-br-md'
                        : 'rounded-bl-md'
                    }`}
                    style={{
                      background: isMe ? `${theme.primary}20` : 'var(--t-bg-card)',
                      border: isMe ? 'none' : '1px solid var(--t-border-lt)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-medium ${isMe ? '' : ''}`} style={{ color: isMe ? theme.primaryLight : STATUS_COLORS.in_progress }}>
                        {isMe ? fb.you : (msg.isAdminReply ? fb.adminReply : msg.senderName)}
                      </span>
                      <span className="text-[10px] text-t-text3">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-t-text1 whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {selectedTicket && selectedTicket.status !== 'closed' && (
        <div className="px-4 py-3 border-t border-t-border-lt">
          <div className="flex items-end gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={fb.typeMessage}
              rows={1}
              className="flex-1 px-4 py-2.5 rounded-xl border border-t-border-lt bg-t-card text-t-text1 text-sm placeholder:text-t-text3 focus:outline-none focus:border-t-border transition-colors resize-none"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !chatInput.trim()}
              className="p-2.5 rounded-xl transition-all duration-200 disabled:opacity-30"
              style={{ background: `${theme.primary}20`, color: theme.primaryLight }}
            >
              {sending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      )}

      {selectedTicket && selectedTicket.status === 'closed' && (
        <div className="px-4 py-3 border-t border-t-border-lt text-center">
          <p className="text-sm text-t-text3">{fb.status.closed}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {error && view !== 'create' && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-400/60 hover:text-red-400">
            <XCircle size={14} />
          </button>
        </div>
      )}
      {view === 'list' && renderTicketList()}
      {view === 'create' && renderCreateForm()}
      {view === 'chat' && renderChat()}
    </div>
  );
}
