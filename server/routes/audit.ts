import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { getAuditLogs, logAuditEvent } from '../services/auditService.js';

const router = express.Router();

// Get audit logs
router.get('/', authenticateToken, requirePermission('read'), (req: any, res) => {
  try {
    const {
      userId,
      action,
      resource,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      userId,
      action,
      resource,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: Number(limit),
      offset: Number(offset)
    };

    // Role-based filtering
    if (req.user.role !== 'global_admin') {
      // Non-global admins can only see their own audit logs
      filters.userId = req.user.id;
    }

    const result = getAuditLogs(filters);

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'view_audit_logs',
      resource: 'audit_log',
      details: { filters, resultCount: result.logs.length },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      status: 'success'
    });

    res.json(result);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit statistics
router.get('/stats', authenticateToken, requirePermission('read'), (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date()
    };

    const logs = getAuditLogs(filters).logs;

    const stats = {
      totalEvents: logs.length,
      successEvents: logs.filter(log => log.status === 'success').length,
      failureEvents: logs.filter(log => log.status === 'failure').length,
      warningEvents: logs.filter(log => log.status === 'warning').length,
      actionBreakdown: logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      resourceBreakdown: logs.reduce((acc, log) => {
        acc[log.resource] = (acc[log.resource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      userBreakdown: logs.reduce((acc, log) => {
        acc[log.userRole] = (acc[log.userRole] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'view_audit_stats',
      resource: 'audit_log',
      details: { dateRange: filters },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      status: 'success'
    });

    res.json(stats);
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as auditRoutes };