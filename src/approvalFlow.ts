import { randomUUID } from 'crypto';
import { Employee, Expense } from './types.js';

export class System {
  private threshold: number;
  //TODO: make it a map
  private expenses: Expense[];
  //TODO: make it a map
  private employees: Employee[];

  constructor(threshold: number) {
    //TODO: add threshold validation here: >= 0
    this.threshold = threshold;
    this.expenses = [];
    this.employees = [];
  }

  setEmployees(employees: Employee[]) {
    this.employees = employees;
  }

  //TODO: make some of these methods private and put the public methods above them

  // Create a new expense
  createExpense(amount: number, submitterUid: Employee['uid']): string {
    this.validateSubmitter(submitterUid);
    //TODO: validate amount > 0
    const expense = new Expense(randomUUID(), amount, submitterUid, 'SUBMITTED', ['SUBMITTED']);

    this.expenses.push(expense);
    return expense.getId();
  }

  // Start the approval process
  startApproval(expenseId: string, submitterUid: number) {
    const expense = this.getExpense(expenseId);
    const submitter = this.getSubmitterFromId(submitterUid);
    const managerId = submitter.getManager();
    const manager = this.getManagerFromId(managerId);
    const newStatus = 'PENDING_MANAGER';
    expense.setStatus(newStatus);
  }

  // Get the next approvers for an expense
  nextApprovers(expenseId: string): number[] {
    const expense = this.getExpense(expenseId);
    const status = expense.getStatus();
    let submitter = this.getSubmitterFromId(expense.getSubmitterUid());
    let managerId: number | undefined;
    switch (status) {
      case 'SUBMITTED':
      case 'APPROVED':
      case 'REJECTED_MANAGER':
      case 'REJECTED_SENIOR_MANAGER':
      case 'REJECTED_FINANCE_EXPERT':
        return [];
      case 'PENDING_FINANCE_EXPERT': {
        const financeExperts = this.employees.filter((emp) => emp.getRole() === 'FINANCE_EXPERT');
        return financeExperts.map((emp) => emp.getUid());
      }
      case 'PENDING_MANAGER':
        submitter = this.getSubmitterFromId(expense.getSubmitterUid());
        managerId = submitter.getManager();
        return [managerId];
      case 'PENDING_SENIOR_MANAGER':
        submitter = this.getSubmitterFromId(expense.getSubmitterUid());
        managerId = submitter.getManager();
        const manager = this.getManagerFromId(managerId);
        const seniorManager = manager.getManager();
        return [seniorManager];
      default: {
        throw new Error('Error: no next approver found. Start the approval process first');
      }
    }
  }

  approve(expenseId: string, approverUid: number) {
    const expense = this.getExpense(expenseId);
    const nextApprovers = this.nextApprovers(expenseId);
    if (nextApprovers.includes(approverUid)) {
      expense.setStatus(StatusService.getNextApprovalStatus(expense, this.threshold));
    } else {
      throw new Error('Error: approver is not in authorised to approve this expense');
    }
  }

  reject(expenseId: string, approverUid: number) {
    const expense = this.getExpense(expenseId);
    const nextApprovers = this.nextApprovers(expenseId);
    if (nextApprovers.includes(approverUid)) {
      expense.setStatus(StatusService.getNextRejectionStatus(expense));
    } else {
      throw new Error('Error: approver is not in authorised to approve this expense');
    }
  }

  // Dump the current flow of an expense
  dumpFlow(expenseId: string) {
    const expense = this.getExpense(expenseId);
    console.debug(
      `Current flow for expense ${expenseId}: ${expense.getApprovalHistory().join(' -> ')}`
    );
  }

  // Getters with validation
  getExpense(expenseId: string) {
    const expense = this.expenses.find((exp) => exp.getId() === expenseId);
    if (!expense) {
      throw new Error('Error: expense not found');
    }
    return expense;
  }

  getSubmitterFromId(submitterUid: number) {
    this.validateSubmitter(submitterUid);
    return this.employees.find((emp) => emp.getUid() === submitterUid);
  }

  //TODO: is it duplicated under this function?
  getManagerFromId(managerId: number) {
    if (!managerId) {
      throw new Error('Error: manager employee of submitter employee not found');
    }
    return this.employees.find((emp) => emp.getUid() === managerId);
  }

  getApproverFromId(approverUid: number) {
    const approver = this.employees.find((emp) => emp.getUid() === approverUid);
    if (!approver) {
      throw new Error('Error: approver employee not found');
    }
    return approver;
  }

  getFinanceExperts() {
    const financeExperts = this.employees.filter((emp) => emp.getRole() === 'FINANCE_EXPERT');
    if (financeExperts.length === 0) {
      throw new Error('No finance experts available');
    }
    return financeExperts;
  }

  getFinanceExpertById(financeExpertId: number) {
    const financeExpert = this.employees.find((emp) => emp.getUid() === financeExpertId);
    if (!financeExpert) {
      throw new Error('Error: finance expert employee not found');
    }
    if (financeExpert.getRole() !== 'FINANCE_EXPERT') {
      throw new Error('Error: employee is not a finance expert');
    }
    return financeExpert;
  }

  validateSubmitter(submitterUid: number) {
    const submitter = this.employees.find((emp) => emp.getUid() === submitterUid);
    if (!submitter) {
      throw new Error('Error: submitter employee not found');
    }
    if (submitter.getRole() !== 'EMPLOYEE') {
      throw new Error('Error: only employees can submit expenses');
    }
  }
}

class StatusService {
  static getNextApprovalStatus(expense: Expense, threshold: number) {
    const status = expense.getStatus();
    switch (status) {
      case 'PENDING_MANAGER':
        if (expense.getAmount() < threshold) {
          return 'PENDING_FINANCE_EXPERT';
        } else {
          return 'PENDING_SENIOR_MANAGER';
        }
      case 'PENDING_SENIOR_MANAGER':
        return 'PENDING_FINANCE_EXPERT';
      case 'PENDING_FINANCE_EXPERT':
        return 'APPROVED';
      default:
        throw new Error(
          `Error: expense is in status ${status} is not in a valid state for approval`
        );
    }
  }

  static getNextRejectionStatus(expense: Expense) {
    const status = expense.getStatus();
    switch (status) {
      case 'PENDING_MANAGER':
        return 'REJECTED_MANAGER';
      case 'PENDING_SENIOR_MANAGER':
        return 'REJECTED_SENIOR_MANAGER';
      case 'PENDING_FINANCE_EXPERT':
        return 'REJECTED_FINANCE_EXPERT';
      default:
        `Error: expense is in status ${status} is not in a valid state for rejection`;
    }
  }
}
