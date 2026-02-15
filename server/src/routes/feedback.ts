/**
 * Feedback / Ticket API routes
 * Users can create tickets and chat within them.
 * Admins can view all tickets and reply.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/index.js';
import * as usersRepo from '../db/repositories/users.js';

export const feedbackRouter = Router();

// ============================================
// Types
// ============================================

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: usersRepo.User;
}

// ============================================
// Admin middleware — requires role = admin or superadmin
// ============================================

export function adminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

// ============================================
// User endpoints
// ============================================

/**
 * GET /api/feedback/tickets
 * List current user's tickets
 */
feedbackRouter.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await query(`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM feedback_messages m WHERE m.ticket_id = t.id AND m.is_admin_reply = TRUE AND m.read_at IS NULL) AS unread_count
      FROM feedback_tickets t
      WHERE t.user_id = $1
      ORDER BY t.updated_at DESC
    `, [req.userId]);

    const tickets = result.rows.map(mapTicketRow);
    res.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * POST /api/feedback/tickets
 * Create a new ticket
 */
feedbackRouter.post('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { subject, message, category, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Create ticket
    const ticketResult = await query(`
      INSERT INTO feedback_tickets (user_id, subject, category, priority)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.userId, subject, category || null, priority || 'medium']);

    const ticket = mapTicketRow(ticketResult.rows[0]);

    // Create first message
    await query(`
      INSERT INTO feedback_messages (ticket_id, sender_id, content, is_admin_reply)
      VALUES ($1, $2, $3, FALSE)
    `, [ticket.id, req.userId, message]);

    res.status(201).json({ ticket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

/**
 * GET /api/feedback/tickets/:ticketId
 * Get a single ticket with messages
 */
feedbackRouter.get('/tickets/:ticketId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { ticketId } = req.params;

    // Get ticket (user can only see their own, admin can see all)
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
    const ticketResult = await query(`
      SELECT t.*, u.display_name as user_display_name, u.email as user_email
      FROM feedback_tickets t
      JOIN users u ON u.id = t.user_id
      WHERE t.id = $1 ${isAdmin ? '' : 'AND t.user_id = $2'}
    `, isAdmin ? [ticketId] : [ticketId, req.userId]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = mapTicketRow(ticketResult.rows[0]);

    // Get messages
    const messagesResult = await query(`
      SELECT m.*, u.display_name as sender_name
      FROM feedback_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC
    `, [ticketId]);

    const messages = messagesResult.rows.map(mapMessageRow);

    // Mark admin replies as read for the user
    if (!isAdmin) {
      await query(`
        UPDATE feedback_messages 
        SET read_at = NOW() 
        WHERE ticket_id = $1 AND is_admin_reply = TRUE AND read_at IS NULL
      `, [ticketId]);
    }

    // Mark user messages as read for admin
    if (isAdmin) {
      await query(`
        UPDATE feedback_messages 
        SET read_at = NOW() 
        WHERE ticket_id = $1 AND is_admin_reply = FALSE AND read_at IS NULL
      `, [ticketId]);
    }

    res.json({ ticket, messages });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

/**
 * POST /api/feedback/tickets/:ticketId/messages
 * Send a message in a ticket
 */
feedbackRouter.post('/tickets/:ticketId/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { ticketId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify ticket access
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
    const ticketResult = await query(`
      SELECT * FROM feedback_tickets
      WHERE id = $1 ${isAdmin ? '' : 'AND user_id = $2'}
    `, isAdmin ? [ticketId] : [ticketId, req.userId]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Insert message
    const messageResult = await query(`
      INSERT INTO feedback_messages (ticket_id, sender_id, content, is_admin_reply)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [ticketId, req.userId, content, isAdmin]);

    // Update ticket updated_at and status
    if (isAdmin) {
      await query(`
        UPDATE feedback_tickets 
        SET status = CASE WHEN status = 'open' THEN 'in_progress'::ticket_status ELSE status END
        WHERE id = $1
      `, [ticketId]);
    } else {
      // If user replies to a resolved ticket, reopen it
      await query(`
        UPDATE feedback_tickets 
        SET status = CASE WHEN status = 'resolved' THEN 'open'::ticket_status ELSE status END
        WHERE id = $1
      `, [ticketId]);
    }

    // Fetch the message with sender info
    const fullMessage = await query(`
      SELECT m.*, u.display_name as sender_name
      FROM feedback_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = $1
    `, [messageResult.rows[0].id]);

    const message = mapMessageRow(fullMessage.rows[0]);
    res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * PATCH /api/feedback/tickets/:ticketId/close
 * Close a ticket (user or admin)
 */
feedbackRouter.patch('/tickets/:ticketId/close', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { ticketId } = req.params;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';

    const result = await query(`
      UPDATE feedback_tickets 
      SET status = 'closed', closed_at = NOW()
      WHERE id = $1 ${isAdmin ? '' : 'AND user_id = $2'}
      RETURNING *
    `, isAdmin ? [ticketId] : [ticketId, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket: mapTicketRow(result.rows[0]) });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

// ============================================
// Admin endpoints
// ============================================

/**
 * GET /api/feedback/admin/tickets
 * List all tickets (admin only)
 */
feedbackRouter.get('/admin/tickets', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereClause = '';
    const params: unknown[] = [];

    if (status && status !== 'all') {
      params.push(status);
      whereClause = `WHERE t.status = $${params.length}`;
    }

    const countResult = await query(`
      SELECT COUNT(*) FROM feedback_tickets t ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].count);

    const ticketsResult = await query(`
      SELECT 
        t.*,
        u.display_name as user_display_name,
        u.email as user_email,
        (SELECT COUNT(*) FROM feedback_messages m WHERE m.ticket_id = t.id AND m.is_admin_reply = FALSE AND m.read_at IS NULL) AS unread_count
      FROM feedback_tickets t
      JOIN users u ON u.id = t.user_id
      ${whereClause}
      ORDER BY 
        CASE t.status 
          WHEN 'open' THEN 0 
          WHEN 'in_progress' THEN 1 
          WHEN 'resolved' THEN 2 
          WHEN 'closed' THEN 3 
        END,
        t.updated_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit as string), offset]);

    const tickets = ticketsResult.rows.map(mapTicketRow);
    res.json({ tickets, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * PATCH /api/feedback/admin/tickets/:ticketId/status
 * Update ticket status (admin only)
 */
feedbackRouter.patch('/admin/tickets/:ticketId/status', adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(`
      UPDATE feedback_tickets 
      SET status = $2, 
          assigned_admin_id = COALESCE(assigned_admin_id, $3),
          closed_at = CASE WHEN $2 = 'closed' THEN NOW() ELSE closed_at END
      WHERE id = $1
      RETURNING *
    `, [ticketId, status, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket: mapTicketRow(result.rows[0]) });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

/**
 * GET /api/feedback/admin/stats
 * Get ticket statistics (admin only)
 */
feedbackRouter.get('/admin/stats', adminMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'open') as open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) as total_count
      FROM feedback_tickets
    `);

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================
// Helper functions
// ============================================

function mapTicketRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    category: row.category,
    assignedAdminId: row.assigned_admin_id,
    closedAt: row.closed_at ? (row.closed_at as Date).toISOString?.() || row.closed_at : null,
    createdAt: (row.created_at as Date).toISOString?.() || row.created_at,
    updatedAt: (row.updated_at as Date).toISOString?.() || row.updated_at,
    unreadCount: parseInt(row.unread_count as string || '0'),
    // Admin-visible fields
    userDisplayName: row.user_display_name,
    userEmail: row.user_email,
  };
}

function mapMessageRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    content: row.content,
    isAdminReply: row.is_admin_reply,
    readAt: row.read_at ? (row.read_at as Date).toISOString?.() || row.read_at : null,
    createdAt: (row.created_at as Date).toISOString?.() || row.created_at,
  };
}
