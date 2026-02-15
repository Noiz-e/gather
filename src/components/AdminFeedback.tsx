import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getAdminTickets,
  getTicketDetail,
  sendTicketMessage,
  updateTicketStatus,
  getFeedbackStats,
  FeedbackTicket,
  FeedbackMessage,
  FeedbackStats,
} from '../services/api';
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  User as UserIcon,
  Inbox,
} from 'lucide-react';

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

export function AdminFeedback() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fb = t.feedback;
  const adm = fb.admin;

  // Load tickets
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketData, statsData] = await Promise.all([
        getAdminTickets({ status: statusFilter === 'all' ? undefined : statusFilter }),
        getFeedbackStats(),
      ]);
      setTickets(ticketData.tickets);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load admin tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Open ticket chat
  const openTicket = async (ticket: FeedbackTicket) => {
    try {
      setSelectedTicket(ticket);
      setShowChat(true);
      const data = await getTicketDetail(ticket.id);
      setSelectedTicket(data.ticket);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load ticket:', err);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedTicket) return;
    try {
      setSending(true);
      const msg = await sendTicketMessage(selectedTicket.id, chatInput.trim());
      setMessages(prev => [...prev, msg]);
      setChatInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // Update status
  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      const updated = await updateTicketStatus(ticketId, status);
      setSelectedTicket(updated);
      loadTickets();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const goBack = () => {
    setShowChat(false);
    setSelectedTicket(null);
    setMessages([]);
    loadTickets();
  };

  const statusFilters = [
    { key: 'all', label: adm.all },
    { key: 'open', label: adm.stats.open },
    { key: 'in_progress', label: adm.stats.inProgress },
    { key: 'resolved', label: adm.stats.resolved },
    { key: 'closed', label: adm.stats.closed },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif text-t-text1">{adm.title}</h1>
        <p className="text-sm text-t-text3 mt-1">{adm.subtitle}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { key: 'open', label: adm.stats.open, count: stats.open_count, color: STATUS_COLORS.open },
            { key: 'in_progress', label: adm.stats.inProgress, count: stats.in_progress_count, color: STATUS_COLORS.in_progress },
            { key: 'resolved', label: adm.stats.resolved, count: stats.resolved_count, color: STATUS_COLORS.resolved },
            { key: 'closed', label: adm.stats.closed, count: stats.closed_count, color: STATUS_COLORS.closed },
            { key: 'total', label: adm.stats.total, count: stats.total_count, color: theme.primary },
          ].map((s) => (
            <div
              key={s.key}
              className="p-4 rounded-xl border border-t-border-lt bg-t-card"
            >
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs text-t-text3 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-4 h-[calc(100vh-320px)] min-h-[400px]">
        {/* Ticket list */}
        <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border border-t-border-lt rounded-xl bg-t-card overflow-hidden flex-shrink-0`}>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-t-border-lt overflow-x-auto">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  statusFilter === f.key
                    ? 'text-t-text1 bg-t-card-hover'
                    : 'text-t-text3 hover:text-t-text2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-t-text3" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Inbox size={36} className="text-t-text3 opacity-30 mb-3" />
                <p className="text-sm text-t-text3">{adm.noTickets}</p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const StatusIcon = STATUS_ICONS[ticket.status] || AlertCircle;
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => openTicket(ticket)}
                    className={`w-full text-left px-4 py-3 border-b border-t-border-lt hover:bg-t-card-hover transition-all duration-200 ${
                      isSelected ? 'bg-t-card-hover' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon size={12} style={{ color: STATUS_COLORS[ticket.status] }} />
                          <span className="text-xs text-t-text3 truncate">
                            {ticket.userDisplayName || ticket.userEmail}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-t-text1 truncate">{ticket.subject}</p>
                        <p className="text-[10px] text-t-text3 mt-1">
                          {new Date(ticket.updatedAt).toLocaleDateString()} {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {ticket.unreadCount > 0 && (
                        <span
                          className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
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

        {/* Chat panel */}
        <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-col flex-1 border border-t-border-lt rounded-xl bg-t-card overflow-hidden`}>
          {selectedTicket ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-t-border-lt">
                <button
                  onClick={goBack}
                  className="md:hidden p-1.5 rounded-lg hover:bg-t-card-hover transition-colors"
                >
                  <ArrowLeft size={18} className="text-t-text3" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-t-text1 truncate">{selectedTicket.subject}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <UserIcon size={10} className="text-t-text3" />
                    <span className="text-[10px] text-t-text3">
                      {selectedTicket.userDisplayName || selectedTicket.userEmail}
                    </span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `${STATUS_COLORS[selectedTicket.status]}20`,
                        color: STATUS_COLORS[selectedTicket.status],
                      }}
                    >
                      {fb.status[selectedTicket.status as keyof typeof fb.status]}
                    </span>
                  </div>
                </div>
                {/* Status actions */}
                <div className="flex items-center gap-1">
                  {selectedTicket.status === 'open' && (
                    <button
                      onClick={() => handleStatusChange(selectedTicket.id, 'in_progress')}
                      className="text-[10px] px-2 py-1 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      {adm.markInProgress}
                    </button>
                  )}
                  {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
                    <button
                      onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                      className="text-[10px] px-2 py-1 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                    >
                      {adm.markResolved}
                    </button>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <button
                      onClick={() => handleStatusChange(selectedTicket.id, 'closed')}
                      className="text-[10px] px-2 py-1 rounded-lg text-t-text3 hover:bg-t-card-hover transition-colors"
                    >
                      {adm.close}
                    </button>
                  )}
                  {(selectedTicket.status === 'closed' || selectedTicket.status === 'resolved') && (
                    <button
                      onClick={() => handleStatusChange(selectedTicket.id, 'open')}
                      className="text-[10px] px-2 py-1 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      {adm.reopen}
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const isAdmin = msg.isAdminReply;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          isAdmin ? 'rounded-br-md' : 'rounded-bl-md'
                        }`}
                        style={{
                          background: isAdmin ? `${theme.primary}20` : 'var(--t-bg-surface)',
                          border: isAdmin ? 'none' : '1px solid var(--t-border-lt)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: isAdmin ? theme.primaryLight : STATUS_COLORS.open }}
                          >
                            {isMe ? fb.you : msg.senderName}
                            {isAdmin && !isMe && ` (${fb.adminReply})`}
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
              </div>

              {/* Input */}
              {selectedTicket.status !== 'closed' && (
                <div className="px-4 py-3 border-t border-t-border-lt">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={fb.typeMessage}
                      rows={1}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-t-border-lt bg-transparent text-t-text1 text-sm placeholder:text-t-text3 focus:outline-none focus:border-t-border transition-colors resize-none"
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-t-text3">
              <Inbox size={48} className="opacity-20 mb-4" />
              <p className="text-sm">{adm.allTickets}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
