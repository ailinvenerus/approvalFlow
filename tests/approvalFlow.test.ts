import { describe } from 'node:test';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { System } from '../src/approvalFlow.js';

const usersJsonPath = '../tests/input/users.json';

describe('createExpense', () => {
  it('Should create an expense correctly', () => {
    const system = new System(1000, usersJsonPath);
    const expenseId = system.createExpense(500, 1);
    const expense = system.getExpenses().get(expenseId);
    expect(expenseId).toBeDefined();
    expect(expense).toBeDefined();
    expect(expense.getAmount()).toBe(500);
    expect(expense.getStatus()).toBe('SUBMITTED');
  });

  it('Should throw an error when submitter does not exist', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 999;
    expect(() => system.createExpense(500, submitterUid)).toThrow(
      `Error: submitter uid ${submitterUid} not found`
    );
  });

  it('Should throw an error when submitter is a manager', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 2;
    expect(() => system.createExpense(500, submitterUid)).toThrow(
      'Error: only employees can submit expenses'
    );
  });

  it('Should throw an error when submitter is a senior manager', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 5;
    expect(() => system.createExpense(500, submitterUid)).toThrow(
      'Error: only employees can submit expenses'
    );
  });

  it('Should throw an error when creating an expense with amount < 0', () => {
    const system = new System(1000, usersJsonPath);
    expect(() => system.createExpense(-100, 1)).toThrow(
      'Error: expense amount must be greater than 0'
    );
  });

  it('Should throw an error when creating an expense with amount 0', () => {
    const system = new System(1000, usersJsonPath);
    expect(() => system.createExpense(0, 1)).toThrow(
      'Error: expense amount must be greater than 0'
    );
  });
});

describe('startApproval', () => {
  it('Should start approval process for an expense', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const expense = system.getExpenses().get(expenseId);
    expect(expense).toBeDefined();
    expect(expense.getStatus()).toBe('PENDING_MANAGER');
    expect(expense.getSubmitterUid()).toBe(submitterUid);
    expect(expense.getApprovalHistory()).toEqual(['SUBMITTED', 'PENDING_MANAGER']);
  });

  it('Should throw error if expense does ont exist', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const expenseId = 'non-existent-id';
    expect(() => system.startApproval(expenseId, submitterUid)).toThrow(
      `Error: expense with id ${expenseId} not found`
    );
  });
});

describe('nextApprovers', () => {
  it('Should throw error if an expense has status `SUBMITTED`', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    expect(() => system.nextApprovers(expenseId)).toThrow(
      'Error: no next approver found. Start the approval process first'
    );
  });

  it('Should return correct next approvers for an expense with status `PENDING_MANAGER`', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const submitter = system.getEmployees().get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const nextApprovers = system.nextApprovers(expenseId);
    const manager = submitter.getManager();
    const expectedApprovers = [manager];
    expect(nextApprovers).toEqual(expectedApprovers);
  });

  it('Should return correct next approvers for an expense with status `PENDING_SENIOR_MANAGER`', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const manager = submitter.getManager();
    system.approve(expenseId, manager); // new status: PENDING_SENIOR_MANAGER
    const seniorManager = employees.get(manager).getManager();
    const nextApprovers = system.nextApprovers(expenseId);
    const expectedApprovers = [seniorManager];
    expect(nextApprovers).toEqual(expectedApprovers);
  });

  it('Should return correct next approvers for an expense with status `PENDING_FINANCE_EXPERT`', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const submitter = system.getEmployees().get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const manager = submitter.getManager();
    system.approve(expenseId, manager); // new status: PENDING_FINANCE_EXPERT
    const nextApprovers = system.nextApprovers(expenseId);
    const expectedApprovers = system.getFinanceExpertSIds();
    expect(nextApprovers).toEqual(expectedApprovers);
  });

  it('Should return empty list of next approvers for an expense with status `APPROVED`', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const submitter = system.getEmployees().get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const manager = submitter.getManager();
    system.approve(expenseId, manager); // new status: PENDING_FINANCE_EXPERT
    system.approve(expenseId, 6); // new status: APPROVED
    const nextApprovers = system.nextApprovers(expenseId);
    expect(nextApprovers).toHaveLength(0);
  });

  it('Should return empty list of next approvers for an expense with status `REJECTED_MANAGER`', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const submitter = system.getEmployees().get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const manager = submitter.getManager();
    system.reject(expenseId, manager); // new status: REJECTED_MANAGER
    const nextApprovers = system.nextApprovers(expenseId);
    expect(nextApprovers).toHaveLength(0);
  });

  it('Should return empty list of next approvers for an expense with status `REJECTED_SENIOR_MANAGER`', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid);
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const manager = submitter.getManager();
    system.approve(expenseId, manager); // new status: PENDING_SENIOR_MANAGER
    const seniorManager = employees.get(manager).getManager();
    system.reject(expenseId, seniorManager); // new status: REJECTED_SENIOR_MANAGER
    const nextApprovers = system.nextApprovers(expenseId);
    expect(nextApprovers).toHaveLength(0);
  });

  it('Should return empty list of next approvers for an expense with status `REJECTED_FINANCE_EXPERT`', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const submitter = system.getEmployees().get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const manager = submitter.getManager();
    system.approve(expenseId, manager); // new status: PENDING_FINANCE_EXPERT
    system.reject(expenseId, 6); // new status: REJECTED_FINANCE_EXPERT
    const nextApprovers = system.nextApprovers(expenseId);
    expect(nextApprovers).toHaveLength(0);
  });
});

describe('approve', () => {
  it('Should approve an expense and pass it to the next step', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const manager = submitter.getManager();
    system.approve(expenseId, manager); // new status: PENDING_FINANCE_EXPERT
    const expense = system.getExpenses().get(expenseId);
    expect(expense).toBeDefined();
    expect(expense.getStatus()).toBe('PENDING_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
    ]);
  });

  it('Should throw an error if expense does not exist', () => {
    const system = new System(1000, usersJsonPath);
    const approverUid = 1;
    const expenseId = 'non-existent-id';
    expect(() => system.approve(expenseId, approverUid)).toThrow(
      `Error: expense with id ${expenseId} not found`
    );
  });

  it('Should throw an error if approver is not in next approvers list', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const nextApprovers = system.nextApprovers(expenseId);
    const notCorrectManagerUid = 6;
    expect(nextApprovers).not.toContain(notCorrectManagerUid);
    expect(() => system.approve(expenseId, notCorrectManagerUid)).toThrow(
      'Error: approver is not in authorised to approve this expense'
    );
  });
});

describe('reject', () => {
  it('Should reject an expense and pass it to the next step', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const manager = submitter.getManager();
    system.reject(expenseId, manager); // new status: REJECTED_MANAGER
    const expense = system.getExpenses().get(expenseId);
    expect(expense).toBeDefined();
    expect(expense.getStatus()).toBe('REJECTED_MANAGER');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'REJECTED_MANAGER',
    ]);
  });

  it('Should throw an error if expense does not exist', () => {
    const system = new System(1000, usersJsonPath);
    const approverUid = 1;
    const expenseId = 'non-existent-id';
    expect(() => system.reject(expenseId, approverUid)).toThrow(
      `Error: expense with id ${expenseId} not found`
    );
  });

  it('Should throw an error if approver is not in next approvers list', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const nextApprovers = system.nextApprovers(expenseId);
    const notCorrectManagerUid = 6;
    expect(nextApprovers).not.toContain(notCorrectManagerUid);
    expect(() => system.reject(expenseId, notCorrectManagerUid)).toThrow(
      'Error: approver is not in authorised to reject this expense'
    );
  });
});

describe('dumpflow', () => {
  let system: System;
  let consoleSpy: any;

  beforeEach(async () => {
    system = new System(1000, usersJsonPath);
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

  it('Should dump flow with full expense history (up to a stage) correctly', () => {
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    const employees = system.getEmployees();
    system.startApproval(expenseId, submitterUid);
    const managerId = employees.get(submitterUid).getManager();
    system.approve(expenseId, managerId);
    system.dumpFlow(expenseId);
    expect(consoleSpy).toHaveBeenCalledWith(
      `Current flow for expense ${expenseId}: SUBMITTED -> PENDING_MANAGER -> PENDING_FINANCE_EXPERT`
    );
  });

  it('Should dump flow for rejected expense correctly', () => {
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    const employees = system.getEmployees();
    system.startApproval(expenseId, submitterUid);
    const managerId = employees.get(submitterUid).getManager();
    system.reject(expenseId, managerId);
    system.dumpFlow(expenseId);
    expect(consoleSpy).toHaveBeenCalledWith(
      `Current flow for expense ${expenseId}: SUBMITTED -> PENDING_MANAGER -> REJECTED_MANAGER`
    );
  });

  it('Should dump flow for approved expense correctly', () => {
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid);
    const employees = system.getEmployees();
    system.startApproval(expenseId, submitterUid);
    const managerId = employees.get(submitterUid).getManager();
    system.approve(expenseId, managerId);
    const financeExpertId = 6;
    system.approve(expenseId, financeExpertId);
    system.dumpFlow(expenseId);
    expect(consoleSpy).toHaveBeenCalledWith(
      `Current flow for expense ${expenseId}: SUBMITTED -> PENDING_MANAGER -> PENDING_FINANCE_EXPERT -> APPROVED`
    );
  });

  it('Should throw an error if expense does not exist', () => {
    const expenseId = 'non-existent-id';
    expect(() => system.dumpFlow(expenseId)).toThrow(
      `Error: expense with id ${expenseId} not found`
    );
  });
});
