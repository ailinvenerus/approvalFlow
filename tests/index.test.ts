import { describe } from 'node:test';
import { expect, it } from 'vitest';
import { System } from '../src/approvalFlow.js';
import { loadEmployees } from '../src/index.js';

describe('index', () => {
  it('Load employees correctly', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const expectedEmployees = [
      { uid: 1, email: 'jof@tipalti.com', manager: 2, role: 'EMPLOYEE' },
      { uid: 2, email: 'tom@tipalti.com', manager: 5, role: 'MANAGER' },
      { uid: 3, email: 'nico@tipalti.com', manager: 2, role: 'EMPLOYEE' },
      { uid: 4, email: 'ori@tipalti.com', manager: 5, role: 'MANAGER' },
      { uid: 5, email: 'igor@tipalti.com', manager: 5, role: 'SENIOR_MANAGER' },
      { uid: 6, email: 'sergey@approve.com', manager: 7, role: 'FINANCE_EXPERT' },
      { uid: 7, email: 'reut@approve.com', manager: 7, role: 'FINANCE_EXPERT' },
      { uid: 8, email: 'ben@approve.com', manager: 6, role: 'FINANCE_EXPERT' },
      { uid: 9, email: 'susy@tipalti.com', manager: 4, role: 'EMPLOYEE' },
    ];
    expect(system.getEmployees()).toHaveLength(9);
    expect(system.getEmployees()).toEqual(
      expectedEmployees.map((emp) => ({
        uid: emp.uid,
        email: emp.email,
        manager: emp.manager,
        role: emp.role,
        pendingExpenses: [],
      }))
    );
  });
});

describe('Approval flow', () => {
  it('Expense submitted correctly', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('SUBMITTED');
    expect(expense.getApprovalHistory()).toEqual(['SUBMITTED']);
    expect(submitter.getPendingExpenses()).toHaveLength(0);
  });

  it('Approval process started correctly', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    const manager = system.getManagerFromId(managerId);
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('PENDING_MANAGER');
    expect(expense.getApprovalHistory()).toEqual(['SUBMITTED', 'PENDING_MANAGER']);
    expect(submitter.getPendingExpenses()).toHaveLength(0);
    expect(manager.getPendingExpenses()).toHaveLength(1);
    expect(manager.getPendingExpenses()).toContain(expenseId);
  });

  it('Approval process continues correctly with expense < threshold', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    const manager = system.getManagerFromId(managerId);
    system.approve(expenseId, managerId);
    const expense = system.getExpense(expenseId);
    // First finance expert fetched
    const financeExpert = system.getFinanceExpertById(6);
    expect(expense.getStatus()).toBe('PENDING_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
    ]);
    expect(submitter.getPendingExpenses()).toHaveLength(0);
    expect(manager.getPendingExpenses()).toHaveLength(0);
    expect(financeExpert.getPendingExpenses()).toHaveLength(1);
  });

  it('Approved in every stage with expense < threshold', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    const manager = system.getManagerFromId(managerId);
    system.approve(expenseId, managerId);
    // First finance expert fetched
    system.approve(expenseId, 6);
    const financeExpert = system.getFinanceExpertById(6);
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('APPROVED');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
      'APPROVED',
    ]);
    expect(submitter.getPendingExpenses()).toHaveLength(0);
    expect(manager.getPendingExpenses()).toHaveLength(0);
    expect(financeExpert.getPendingExpenses()).toHaveLength(0);
  });

  it('Rejected by finance expert with expense < threshold', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    const manager = system.getManagerFromId(managerId);
    system.approve(expenseId, managerId);
    // First finance expert fetched
    system.reject(expenseId, 6);
    const financeExpert = system.getFinanceExpertById(6);
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
      'REJECTED_FINANCE_EXPERT',
    ]);
    expect(submitter.getPendingExpenses()).toHaveLength(0);
    expect(manager.getPendingExpenses()).toHaveLength(0);
    expect(financeExpert.getPendingExpenses()).toHaveLength(0);
  });

  it('Rejected by manager with expense < threshold', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(500, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    const manager = system.getManagerFromId(managerId);
    system.reject(expenseId, managerId);
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_MANAGER');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'REJECTED_MANAGER',
    ]);
    expect(submitter.getPendingExpenses()).toHaveLength(0);
    expect(manager.getPendingExpenses()).toHaveLength(0);
  });

  it('Approved in every stage with expense > threshold', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId);
    const manager = system.getManagerFromId(managerId);
    const seniorManager = system.getManagerFromId(manager.getManager());
    system.approve(expenseId, seniorManager.getUid());
    // First finance expert fetched
    system.approve(expenseId, 6);
    const financeExpert = system.getFinanceExpertById(6);
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('APPROVED');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_SENIOR_MANAGER',
      'PENDING_FINANCE_EXPERT',
      'APPROVED',
    ]);
    expect(submitter.getPendingExpenses()).toHaveLength(0);
    expect(manager.getPendingExpenses()).toHaveLength(0);
    expect(seniorManager.getPendingExpenses()).toHaveLength(0);
    expect(financeExpert.getPendingExpenses()).toHaveLength(0);
  });

  it('Rejected by finance expert with expense > threshold', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId);
    const manager = system.getManagerFromId(managerId);
    const seniorManager = system.getManagerFromId(manager.getManager());
    system.approve(expenseId, seniorManager.getUid());
    system.reject(expenseId, 6);
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_SENIOR_MANAGER',
      'PENDING_FINANCE_EXPERT',
      'REJECTED_FINANCE_EXPERT',
    ]);
  });

  it('Rejected by senior manager with expense > threshold', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId);
    const manager = system.getManagerFromId(managerId);
    const seniorManager = system.getManagerFromId(manager.getManager());
    system.reject(expenseId, seniorManager.getUid());
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_SENIOR_MANAGER');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_SENIOR_MANAGER',
      'REJECTED_SENIOR_MANAGER',
    ]);
  });

  it('Rejected by manager with expense > threshold', async () => {
    const system = new System(1000);
    await loadEmployees(system);
    const submitterUid = 1;
    const submitter = system.getSubmitterFromId(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid);
    system.startApproval(expenseId, submitterUid);
    const managerId = submitter.getManager();
    system.reject(expenseId, managerId);
    const expense = system.getExpense(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_MANAGER');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'REJECTED_MANAGER',
    ]);
  });
});
