import { describe } from 'node:test';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { System } from '../src/approvalFlow.js';
import { loadEmployees } from '../src/index.js';

describe('System', () => {
  it('Should initialise with correct values', () => {
    const system = new System(1000);
    expect(system.getThreshold()).toBe(1000);
    expect(system.getExpenses()).toEqual([]);
    expect(system.getEmployees()).toEqual([]);
  });

  it('Should set threshold correctly', () => {
    const system = new System(1000);
    system.setThreshold(2000);
    expect(system.getThreshold()).toBe(2000);
  });
});

describe('Getter and validation', () => {
  it('Should fail when submitter is not found', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    expect(() => system.validateSubmitter(999)).toThrow('Error: submitter employee not found');
  });

  it('Should fail when submitter is not an employee', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    expect(() => system.validateSubmitter(2)).toThrow('Error: only employees can submit expenses');
  });

  it('Should fail when expense is not found', async () => {
    const system = new System(1000);
    expect(() => system.getExpense('non-existent-id')).toThrow('Error: expense not found');
  });

  it('Should fail when approver is not found', async () => {
    const system = new System(1000);
    expect(() => system.getApproverFromId(999)).toThrow('Error: approver employee not found');
  });

  it('Should fail when no finance experts available', () => {
    const system = new System(1000);
    expect(() => system.getFinanceExperts()).toThrow('No finance experts available');
  });

  it('Should select finance expert with least pending expenses', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const expert = system.selectFinanceExpert();
    expect(expert.getRole()).toBe('FINANCE_EXPERT');
    expect(expert.getPendingExpenses()).toHaveLength(0);
  });

  it('Should select finance expert with least pending expenses when multiple have more', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const financeExpert1 = system.getFinanceExperts().find((expert) => expert.getUid() === 6);
    const financeExpert2 = system.getFinanceExperts().find((expert) => expert.getUid() === 7);
    financeExpert1.addPendingExpense('expense-1');
    financeExpert1.addPendingExpense('expense-2');
    financeExpert2.addPendingExpense('expense-3');
    const expert = system.selectFinanceExpert();
    expect(expert.getUid()).toBe(8);
    expect(expert.getRole()).toBe('FINANCE_EXPERT');
    expect(expert.getPendingExpenses()).toHaveLength(0);
  });

  it('Should get next approvers for pending finance expert state', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = system.getSubmitterFromId(submitterUid).getManager();
    system.approve(expenseId, managerId);
    const nextApprovers = system.nextApprovers(expenseId);
    expect(nextApprovers).toContain(6);
    expect(nextApprovers).toContain(7);
    expect(nextApprovers).toContain(8);
  });

  it('Should get empty next approvers for final states', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = system.getSubmitterFromId(submitterUid).getManager();
    system.reject(expenseId, managerId);
    const nextApprovers = system.nextApprovers(expenseId);
    expect(nextApprovers).toEqual([]);
  });

  it('Should get manager as next approvers after start approval', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const nextApprovers = system.nextApprovers(expenseId);
    expect(nextApprovers).toEqual([2]);
  });

  it('Should fail when trying to approve without starting approval process', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    expect(() => system.nextApprovers(expenseId)).toThrow(
      'Error: no next approver found. Start the approval process first'
    );
  });

  it('Should fail when trying to approve an expense not pending for approver', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    expect(() => system.approve(expenseId, 6)).toThrow(
      'Error: approver does not have this expense pending'
    );
  });

  it('Should fail when trying to reject an expense not pending for approver', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    expect(() => system.reject(expenseId, 6)).toThrow(
      'Error: approver does not have this expense pending'
    );
  });

  it('Should fail when employee tries to pass an expense to the next step of approval', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    const expense = system.getExpense(expenseId);
    expect(() => system.passToNextStepOfApproval(expense, submitter)).toThrow(
      'Error: employee cannot approve expenses'
    );
  });

  it('Should fail when employee tries to pass an expense to rejected', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    const expense = system.getExpense(expenseId);
    expect(() => system.passToRejected(expense, submitter)).toThrow(
      'Error: employee cannot approve expenses'
    );
  });

  it('Should fail when trying to get an unexisting manager', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    expect(() => system.getManagerFromId(undefined)).toThrow(
      'Error: manager employee of submitter employee not found'
    );
  });

  it('Should fail when trying to get an unexisting finance expert', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    expect(() => system.getFinanceExpertById(undefined)).toThrow(
      'Error: finance expert employee not found'
    );
  });

  it('Should fail when trying to get a finance expert but it is an employee', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    expect(() => system.getFinanceExpertById(1)).toThrow('Error: employee is not a finance expert');
  });
});

describe('System Console Output', () => {
  let system: System;
  let consoleSpy: any;

  beforeEach(async () => {
    system = new System(1000);
    await loadEmployees(system);
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('Should dump flow for submitted expense correctly', () => {
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.dumpFlow(expenseId);

    expect(consoleSpy).toHaveBeenCalledWith(`Current flow for expense ${expenseId}: SUBMITTED`);
  });

  it('Should dump flow with full expense history correctly', () => {
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = system.getSubmitterFromId(submitterUid).getManager();
    system.approve(expenseId, managerId);
    system.dumpFlow(expenseId);

    expect(consoleSpy).toHaveBeenCalledWith(
      `Current flow for expense ${expenseId}: SUBMITTED -> PENDING_MANAGER -> PENDING_FINANCE_EXPERT`
    );
  });

  it('Should dump flow for rejected expense correctly', () => {
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = system.getSubmitterFromId(submitterUid).getManager();
    system.reject(expenseId, managerId);
    system.dumpFlow(expenseId);

    expect(consoleSpy).toHaveBeenCalledWith(
      `Current flow for expense ${expenseId}: SUBMITTED -> PENDING_MANAGER -> REJECTED_MANAGER`
    );
  });

  it('Should dump flow for approved expense correctly', () => {
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = system.getSubmitterFromId(submitterUid).getManager();
    system.approve(expenseId, managerId);
    // Approve by finance expert
    system.approve(expenseId, 6);
    system.dumpFlow(expenseId);

    expect(consoleSpy).toHaveBeenCalledWith(
      `Current flow for expense ${expenseId}: SUBMITTED -> PENDING_MANAGER -> PENDING_FINANCE_EXPERT -> APPROVED`
    );
  });
});
