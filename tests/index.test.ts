import { describe } from 'node:test';
import { expect, it } from 'vitest';
import { System } from '../src/approvalFlow.js';
import { Expense } from '../src/types.js';

describe('System - validate threshold', () => {
  const usersJsonPath = '../tests/input/users.json';
  it('throw error', () => {
    expect(() => new System(-1000, usersJsonPath)).toThrow(
      'Error: threshold must be a positive number'
    );
  });
  it('get threshold 0', () => {
    const system = new System(0, usersJsonPath);
    expect(system.getThreshold()).toBe(0);
  });
  it('get threshold 1000', () => {
    const system = new System(1000, usersJsonPath);
    expect(system.getThreshold()).toBe(1000);
  });
});

describe('System - load employees and create expenses map', () => {
  it('Load employees correctly', () => {
    const system = new System(1000, '../tests/input/users.json');
    const expectedEmployees = [
      { uid: 1, email: 'jof@tipalti.com', manager: 2, financeExpert: false },
      { uid: 2, email: 'tom@tipalti.com', manager: 5, financeExpert: false },
      { uid: 3, email: 'nico@tipalti.com', manager: 2, financeExpert: false },
      { uid: 4, email: 'ori@tipalti.com', manager: 5, financeExpert: false },
      { uid: 5, email: 'igor@tipalti.com', manager: 5, financeExpert: false },
      { uid: 6, email: 'sergey@approve.com', manager: 7, financeExpert: true },
      { uid: 7, email: 'reut@approve.com', manager: 7, financeExpert: true },
      { uid: 8, email: 'ben@approve.com', manager: 6, financeExpert: true },
    ];
    expect(system.getEmployees()).toHaveLength(8);
    for (let i = 0; i < expectedEmployees.length; i++) {
      const employee = system.getEmployees().get(expectedEmployees[i].uid);
      expect(employee.getUid()).toEqual(expectedEmployees[i].uid);
      expect(employee.getEmail()).toEqual(expectedEmployees[i].email);
      expect(employee.getManager()).toEqual(expectedEmployees[i].manager);
      expect(employee.getFinanceExpert()).toEqual(expectedEmployees[i].financeExpert);
    }
    expect(system.getExpenses()).toEqual(new Map<string, Expense>());
  });

  it('Missing fields in employees input file throws error', () => {
    expect(() => new System(1000, '../tests/input/usersMissingFields.json')).toThrow(
      'Error: input with employees is incorrect'
    );
  });
});

describe('Approval flow', () => {
  const usersJsonPath = '../tests/input/users.json';
  it('Expense submitted correctly', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('SUBMITTED');
    expect(expense.getApprovalHistory()).toEqual(['SUBMITTED']);
  });

  it('Approval process started correctly', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('PENDING_MANAGER');
    expect(expense.getApprovalHistory()).toEqual(['SUBMITTED', 'PENDING_MANAGER']);
  });

  it('Approval process continues correctly with expense < threshold', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId); // new status: PENDING_FINANCE_EXPERT
    const expense = system.getExpenses().get(expenseId);
    const financeExpertsIds = system.getFinanceExpertSIds();
    expect(expense.getStatus()).toBe('PENDING_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
    ]);
    expect(financeExpertsIds).toStrictEqual([6, 7, 8]);
  });

  it('Approved in every stage with expense < threshold', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId); // new status: PENDING_FINANCE_EXPERT
    system.approve(expenseId, 6); // new status: APPROVED
    const financeExpertsIds = system.getFinanceExpertSIds();
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('APPROVED');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
      'APPROVED',
    ]);
    expect(financeExpertsIds).toStrictEqual([6, 7, 8]);
  });

  it('Approved by non-finance expert at final stage should throw error', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId); // new status: PENDING_FINANCE_EXPERT
    const expense = system.getExpenses().get(expenseId);
    expect(() => system.approve(expenseId, managerId)).toThrow(
      'Error: approver is not in authorised to approve this expense'
    );
    expect(system.getExpenses().get(expenseId).getStatus()).toBe('PENDING_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
    ]);
  });

  it('Rejected by finance expert with expense < threshold', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId); // new status: PENDING_FINANCE_EXPERT
    system.reject(expenseId, 7); // new status: REJECTED_FINANCE_EXPERT
    const financeExpertsIds = system.getFinanceExpertSIds();
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
      'REJECTED_FINANCE_EXPERT',
    ]);
    expect(financeExpertsIds).toStrictEqual([6, 7, 8]);
  });

  it('Rejected by wrong employee should throw error', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId); // new status: PENDING_FINANCE_EXPERT
    const expense = system.getExpenses().get(expenseId);
    expect(() => system.reject(expenseId, managerId)).toThrow(
      'Error: approver is not in authorised to reject this expense'
    );
    expect(system.getExpenses().get(expenseId).getStatus()).toBe('PENDING_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_FINANCE_EXPERT',
    ]);
  });

  it('Rejected by manager with expense < threshold', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(500, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.reject(expenseId, managerId); // new status: REJECTED_MANAGER
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_MANAGER');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'REJECTED_MANAGER',
    ]);
  });

  it('Approved in every stage with expense > threshold', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId); // new status: PENDING_SENIOR_MANAGER
    const manager = employees.get(managerId);
    const seniorManager = employees.get(manager.getManager());
    system.approve(expenseId, seniorManager.getUid()); // new status: PENDING_FINANCE_EXPERT
    system.approve(expenseId, 8); // new status: APPROVED
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('APPROVED');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_SENIOR_MANAGER',
      'PENDING_FINANCE_EXPERT',
      'APPROVED',
    ]);
  });

  it('Rejected by finance expert with expense > threshold', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId); // new status: PENDING_SENIOR_MANAGER
    const manager = employees.get(managerId);
    const seniorManager = employees.get(manager.getManager());
    system.approve(expenseId, seniorManager.getUid()); // new status: PENDING_FINANCE_EXPERT
    system.reject(expenseId, 6); // new status: REJECTED_FINANCE_EXPERT
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_FINANCE_EXPERT');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_SENIOR_MANAGER',
      'PENDING_FINANCE_EXPERT',
      'REJECTED_FINANCE_EXPERT',
    ]);
  });

  it('Rejected by senior manager with expense > threshold', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.approve(expenseId, managerId); // new status: PENDING_SENIOR_MANAGER
    const manager = employees.get(managerId);
    const seniorManager = employees.get(manager.getManager());
    system.reject(expenseId, seniorManager.getUid()); // new status: REJECTED_SENIOR_MANAGER
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_SENIOR_MANAGER');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'PENDING_SENIOR_MANAGER',
      'REJECTED_SENIOR_MANAGER',
    ]);
  });

  it('Rejected by manager with expense > threshold', () => {
    const system = new System(1000, usersJsonPath);
    const submitterUid = 1;
    const employees = system.getEmployees();
    const submitter = employees.get(submitterUid);
    const expenseId = system.createExpense(2000, submitterUid); // new status: SUBMITTED
    system.startApproval(expenseId, submitterUid); // new status: PENDING_MANAGER
    const managerId = submitter.getManager();
    system.reject(expenseId, managerId); // new status: REJECTED_MANAGER
    const expense = system.getExpenses().get(expenseId);
    expect(expense.getStatus()).toBe('REJECTED_MANAGER');
    expect(expense.getApprovalHistory()).toEqual([
      'SUBMITTED',
      'PENDING_MANAGER',
      'REJECTED_MANAGER',
    ]);
  });
});
