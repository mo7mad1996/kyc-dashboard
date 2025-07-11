import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mockTransactions, Transaction } from '../models/Transaction.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { logAuditEvent } from '../services/auditService.js';
import { calculateConversion } from '../services/cybridService.js';

const router = express.Router();

// Get transactions (with role-based filtering)
router.get('/', authenticateToken, requirePermission('read'), (req: any, res) => {
  try {
    let transactions = [...mockTransactions];

    // Role-based filtering
    if (req.user.role === 'regional_admin') {
      const user = req.user;
      transactions = transactions.filter(t => t.region === user.region);
    } else if (req.user.role === 'sending_partner' || req.user.role === 'receiving_partner') {
      transactions = transactions.filter(t => t.partnerId === req.user.id);
    }

    // Apply query filters
    const { status, kycStatus, region, limit = 50, offset = 0 } = req.query;
    
    if (status) {
      transactions = transactions.filter(t => t.status === status);
    }
    if (kycStatus) {
      transactions = transactions.filter(t => t.kycStatus === kycStatus);
    }
    if (region && req.user.role === 'global_admin') {
      transactions = transactions.filter(t => t.region === region);
    }

    // Sort by creation date (newest first)
    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const paginatedTransactions = transactions.slice(Number(offset), Number(offset) + Number(limit));

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'view_transactions',
      resource: 'transaction',
      details: { filters: req.query, count: paginatedTransactions.length },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      status: 'success'
    });

    res.json({
      transactions: paginatedTransactions,
      total: transactions.length,
      offset: Number(offset),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, requirePermission('read'), (req: any, res) => {
  try {
    const transaction = mockTransactions.find(t => t.id === req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Role-based access control
    if (req.user.role === 'regional_admin' && transaction.region !== req.user.region) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if ((req.user.role === 'sending_partner' || req.user.role === 'receiving_partner') && 
        transaction.partnerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'view_transaction',
      resource: 'transaction',
      resourceId: transaction.id,
      details: { transactionAmount: transaction.amount, status: transaction.status },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      status: 'success'
    });

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new transaction
router.post('/', authenticateToken, requirePermission('write'), async (req: any, res) => {
  try {
    const {
      fromCurrency,
      toCurrency,
      amount,
      senderId,
      receiverId,
      region,
      metadata
    } = req.body;

    // Calculate conversion using Cybrid service
    const conversion = await calculateConversion(amount, fromCurrency, toCurrency);

    const transaction: Transaction = {
      id: `txn_${uuidv4().substr(0, 8)}`,
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount: conversion.convertedAmount,
      exchangeRate: conversion.exchangeRate,
      status: 'pending',
      kycStatus: 'not_started',
      senderId,
      receiverId,
      region,
      partnerId: req.user.role.includes('partner') ? req.user.id : undefined,
      fees: {
        platform: conversion.fee * 0.7,
        exchange: conversion.fee * 0.3,
        total: conversion.fee
      },
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockTransactions.unshift(transaction);

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'create_transaction',
      resource: 'transaction',
      resourceId: transaction.id,
      details: { amount, fromCurrency, toCurrency, region },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      status: 'success'
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    
    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'create_transaction_failed',
      resource: 'transaction',
      details: { error: error.message, requestBody: req.body },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      status: 'failure'
    });

    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction status
router.patch('/:id/status', authenticateToken, requirePermission('write'), (req: any, res) => {
  try {
    const { status, kycStatus } = req.body;
    const transaction = mockTransactions.find(t => t.id === req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Role-based access control
    if (req.user.role === 'regional_admin' && transaction.region !== req.user.region) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const oldStatus = { status: transaction.status, kycStatus: transaction.kycStatus };
    
    if (status) transaction.status = status;
    if (kycStatus) transaction.kycStatus = kycStatus;
    transaction.updatedAt = new Date();
    
    if (status === 'completed') {
      transaction.completedAt = new Date();
    }

    logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'update_transaction_status',
      resource: 'transaction',
      resourceId: transaction.id,
      details: { oldStatus, newStatus: { status, kycStatus } },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      status: 'success'
    });

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as transactionRoutes };