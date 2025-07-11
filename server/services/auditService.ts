import { v4 as uuidv4 } from 'uuid';
import { mockAuditLogs, AuditLog } from '../models/AuditLog.js';

export const logAuditEvent = (eventData: Omit<AuditLog, 'id' | 'timestamp'>) => {
  const auditLog: AuditLog = {
    id: uuidv4(),
    timestamp: new Date(),
    ...eventData
  };

  // In production, this would save to database
  mockAuditLogs.unshift(auditLog);
  
  // Keep only last 1000 entries for demo
  if (mockAuditLogs.length > 1000) {
    mockAuditLogs.splice(1000);
  }

  console.log('📝 Audit Log:', auditLog);
  return auditLog;
};

export const getAuditLogs = (filters: {
  userId?: string;
  action?: string;
  resource?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  let logs = [...mockAuditLogs];

  // Apply filters
  if (filters.userId) {
    logs = logs.filter(log => log.userId === filters.userId);
  }
  if (filters.action) {
    logs = logs.filter(log => log.action.toLowerCase().includes(filters.action!.toLowerCase()));
  }
  if (filters.resource) {
    logs = logs.filter(log => log.resource.toLowerCase().includes(filters.resource!.toLowerCase()));
  }
  if (filters.status) {
    logs = logs.filter(log => log.status === filters.status);
  }
  if (filters.startDate) {
    logs = logs.filter(log => log.timestamp >= filters.startDate!);
  }
  if (filters.endDate) {
    logs = logs.filter(log => log.timestamp <= filters.endDate!);
  }

  // Sort by timestamp (newest first)
  logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply pagination
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  const paginatedLogs = logs.slice(offset, offset + limit);

  return {
    logs: paginatedLogs,
    total: logs.length,
    offset,
    limit
  };
};