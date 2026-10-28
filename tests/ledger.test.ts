import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

const app = createApp();

describe('Transaction Ledger API Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test database before starting
    await prisma.transfer.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.account.deleteMany({});
  });

  describe('1. Health Check', () => {
    it('should return 200 UP on /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });
  });

  describe('2. Account Creation & Balance Retrieval', () => {
    it('should successfully create an account with an initial balance of 0', async () => {
      const res = await request(app)
        .post('/accounts')
        .send({ name: 'Alice Smith' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Alice Smith');
      expect(res.body.data.balance).toBe(0);
      expect(res.body.data.created_at).toBeDefined();
    });

    it('should reject account creation if name is missing', async () => {
      const res = await request(app).post('/accounts').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject client attempt to set an initial balance', async () => {
      const res = await request(app)
        .post('/accounts')
        .send({ name: 'Hacker Bob', balance: 10000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fetch the current balance of an account', async () => {
      const acc = await request(app)
        .post('/accounts')
        .send({ name: 'Charlie Brown' });

      const res = await request(app).get(`/accounts/${acc.body.data.id}/balance`);
      expect(res.status).toBe(200);
      expect(res.body.data.account_id).toBe(acc.body.data.id);
      expect(res.body.data.balance).toBe(0);
    });

    it('should return 404 when fetching balance for non-existent account', async () => {
      const res = await request(app).get('/accounts/non-existent-uuid/balance');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('3. Transactions & Business Rules', () => {
    let testAccountId: string;

    beforeEach(async () => {
      const acc = await request(app)
        .post('/accounts')
        .send({ name: 'Transaction Test Account' });
      testAccountId = acc.body.data.id;
    });

    it('should credit an account and update the balance', async () => {
      const res = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 100,
          description: 'Initial deposit',
          reference_id: 'REF-001'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.current_balance).toBe(100);

      // Verify balance endpoint matches
      const balRes = await request(app).get(`/accounts/${testAccountId}/balance`);
      expect(balRes.body.data.balance).toBe(100);
    });

    it('should correctly chain credit and debit operations', async () => {
      // 1. Credit 100
      await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 100,
          description: 'Deposit 1',
          reference_id: 'REF-CHAIN-1'
        });

      // 2. Credit 50 -> Balance 150
      await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 50,
          description: 'Deposit 2',
          reference_id: 'REF-CHAIN-2'
        });

      // 3. Debit 30 -> Balance 120
      const debit1 = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'debit',
          amount: 30,
          description: 'Withdrawal 1',
          reference_id: 'REF-CHAIN-3'
        });

      expect(debit1.body.data.current_balance).toBe(120);

      // 4. Debit 20 -> Balance 100
      const debit2 = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'debit',
          amount: 20,
          description: 'Withdrawal 2',
          reference_id: 'REF-CHAIN-4'
        });

      expect(debit2.body.data.current_balance).toBe(100);
    });

    it('should reject debit transaction if account has insufficient balance', async () => {
      // Current balance is 0
      const res = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'debit',
          amount: 50,
          description: 'Overdraft attempt',
          reference_id: 'REF-FAIL-1'
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');

      // Balance remains 0
      const balRes = await request(app).get(`/accounts/${testAccountId}/balance`);
      expect(balRes.body.data.balance).toBe(0);
    });

    it('should reject duplicate transaction with same reference_id on the same account', async () => {
      const txData = {
        type: 'credit',
        amount: 50,
        description: 'First deposit',
        reference_id: 'REF-DUP-TEST'
      };

      // 1. First attempt succeeds
      const firstRes = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send(txData);
      expect(firstRes.status).toBe(201);

      // 2. Second attempt with same reference_id fails
      const dupRes = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send(txData);

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.code).toBe('CONFLICT');

      // Balance remains 50 (not 100)
      const balRes = await request(app).get(`/accounts/${testAccountId}/balance`);
      expect(balRes.body.data.balance).toBe(50);
    });

    it('should allow the same reference_id on DIFFERENT accounts', async () => {
      const otherAcc = await request(app)
        .post('/accounts')
        .send({ name: 'Another User' });

      // Account 1 uses REF-SHARED
      const res1 = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 25,
          description: 'User 1 Deposit',
          reference_id: 'REF-SHARED-123'
        });
      expect(res1.status).toBe(201);

      // Account 2 also uses REF-SHARED - must succeed
      const res2 = await request(app)
        .post(`/accounts/${otherAcc.body.data.id}/transactions`)
        .send({
          type: 'credit',
          amount: 75,
          description: 'User 2 Deposit',
          reference_id: 'REF-SHARED-123'
        });
      expect(res2.status).toBe(201);
    });

    it('should validate invalid amounts (negative, zero, or excess decimals)', async () => {
      const negativeRes = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: -10,
          description: 'Negative',
          reference_id: 'REF-NEG'
        });
      expect(negativeRes.status).toBe(400);

      const zeroRes = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 0,
          description: 'Zero',
          reference_id: 'REF-ZERO'
        });
      expect(zeroRes.status).toBe(400);

      const decimalRes = await request(app)
        .post(`/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 10.999,
          description: 'Too many decimals',
          reference_id: 'REF-DEC'
        });
      expect(decimalRes.status).toBe(400);
    });
  });

  describe('4. Transaction History, Filtering & Pagination', () => {
    let historyAccountId: string;

    beforeAll(async () => {
      const acc = await request(app)
        .post('/accounts')
        .send({ name: 'History Test User' });
      historyAccountId = acc.body.data.id;

      // Seed 5 transactions: 3 credits, 2 debits
      await request(app)
        .post(`/accounts/${historyAccountId}/transactions`)
        .send({ type: 'credit', amount: 100, description: 'C1', reference_id: 'HIST-C1' });
      await request(app)
        .post(`/accounts/${historyAccountId}/transactions`)
        .send({ type: 'credit', amount: 50, description: 'C2', reference_id: 'HIST-C2' });
      await request(app)
        .post(`/accounts/${historyAccountId}/transactions`)
        .send({ type: 'debit', amount: 20, description: 'D1', reference_id: 'HIST-D1' });
      await request(app)
        .post(`/accounts/${historyAccountId}/transactions`)
        .send({ type: 'credit', amount: 30, description: 'C3', reference_id: 'HIST-C3' });
      await request(app)
        .post(`/accounts/${historyAccountId}/transactions`)
        .send({ type: 'debit', amount: 10, description: 'D2', reference_id: 'HIST-D2' });
    });

    it('should return all transactions when no filter is provided', async () => {
      const res = await request(app).get(`/accounts/${historyAccountId}/transactions`);
      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBe(5);
      expect(res.body.data.pagination.totalRecords).toBe(5);
    });

    it('should filter transactions by type=credit', async () => {
      const res = await request(app).get(
        `/accounts/${historyAccountId}/transactions?type=credit`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBe(3);
      res.body.data.transactions.forEach((tx: any) => {
        expect(tx.type).toBe('credit');
      });
    });

    it('should filter transactions by type=debit', async () => {
      const res = await request(app).get(
        `/accounts/${historyAccountId}/transactions?type=debit`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBe(2);
      res.body.data.transactions.forEach((tx: any) => {
        expect(tx.type).toBe('debit');
      });
    });

    it('should support pagination (page & limit)', async () => {
      const res = await request(app).get(
        `/accounts/${historyAccountId}/transactions?page=1&limit=2`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBe(2);
      expect(res.body.data.pagination.currentPage).toBe(1);
      expect(res.body.data.pagination.pageSize).toBe(2);
      expect(res.body.data.pagination.totalRecords).toBe(5);
      expect(res.body.data.pagination.totalPages).toBe(3);
    });

    it('should return transactions sorted in latest-first order', async () => {
      const res = await request(app).get(`/accounts/${historyAccountId}/transactions`);
      expect(res.status).toBe(200);
      const timestamps = res.body.data.transactions.map((t: any) =>
        new Date(t.created_at).getTime()
      );
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });
  });

  describe('5. Bonus: Money Transfer API', () => {
    let sourceId: string;
    let destId: string;

    beforeEach(async () => {
      const accA = await request(app).post('/accounts').send({ name: 'Account A' });
      const accB = await request(app).post('/accounts').send({ name: 'Account B' });
      sourceId = accA.body.data.id;
      destId = accB.body.data.id;

      // Fund Account A with 100, Account B with 50
      await request(app)
        .post(`/accounts/${sourceId}/transactions`)
        .send({ type: 'credit', amount: 100, description: 'Initial', reference_id: 'FUND-A' });
      await request(app)
        .post(`/accounts/${destId}/transactions`)
        .send({ type: 'credit', amount: 50, description: 'Initial', reference_id: 'FUND-B' });
    });

    it('should atomically transfer money from Account A to Account B', async () => {
      const res = await request(app)
        .post('/transfers')
        .send({
          source_account_id: sourceId,
          destination_account_id: destId,
          amount: 30,
          reference_id: 'TR-TRANSFER-101'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.source_balance).toBe(70);
      expect(res.body.data.destination_balance).toBe(80);

      // Verify individual balance checks
      const balA = await request(app).get(`/accounts/${sourceId}/balance`);
      const balB = await request(app).get(`/accounts/${destId}/balance`);
      expect(balA.body.data.balance).toBe(70);
      expect(balB.body.data.balance).toBe(80);
    });

    it('should reject transfer when source account has insufficient balance', async () => {
      const res = await request(app)
        .post('/transfers')
        .send({
          source_account_id: sourceId,
          destination_account_id: destId,
          amount: 500, // More than 100
          reference_id: 'TR-FAIL-OVERDRAFT'
        });

      expect(res.status).toBe(422);

      // Ensure neither balance changed
      const balA = await request(app).get(`/accounts/${sourceId}/balance`);
      const balB = await request(app).get(`/accounts/${destId}/balance`);
      expect(balA.body.data.balance).toBe(100);
      expect(balB.body.data.balance).toBe(50);
    });

    it('should reject transfer between the same account', async () => {
      const res = await request(app)
        .post('/transfers')
        .send({
          source_account_id: sourceId,
          destination_account_id: sourceId,
          amount: 20,
          reference_id: 'TR-SAME-ACC'
        });

      expect(res.status).toBe(400);
    });
  });
});
