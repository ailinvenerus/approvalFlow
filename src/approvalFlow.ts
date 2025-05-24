import { randomUUID } from 'crypto';
import { Employee, Expense } from './types.js';

export class System {
  private threshold: number;
  private expenses: Map<string, Expense>;
  private employees: Map<number, Employee>;
  //TODO: populate when creating employees
  private financeExpertsIds: number[] = [];

  constructor(threshold: number) {
    //TODO: add threshold validation here: >= 0
    this.threshold = threshold;
    this.expenses = new Map<string, Expense>();
    this.employees = new Map<number, Employee>();
  }

  setEmployees(employees: Map<number, Employee>) {
    this.employees = employees;
  }

  // Create a new expense
  createExpense(amount: number, submitterUid: Employee['uid']): string {
    this.validateSubmitter(submitterUid);
    //TODO: validate amount > 0
    const expense = new Expense(randomUUID(), amount, undefined, 'SUBMITTED', ['SUBMITTED']);

    this.expenses.set(expense.getId(), expense);
    return expense.getId();
  }

  // Start the approval process
  startApproval(expenseId: string, submitterUid: number) {
    const expense = this.getExpense(expenseId);
    expense.setSubmitterUid(submitterUid);
    expense.setStatus('PENDING_MANAGER');
  }

  // Get the next approvers for an expense
  nextApprovers(expenseId: string): number[] {
    const expense = this.getExpense(expenseId);
    const status = expense.getStatus();
    const submitter = this.employees.get(expense.getSubmitterUid());
    switch (status) {
      case 'SUBMITTED':
      case 'APPROVED':
      case 'REJECTED_MANAGER':
      case 'REJECTED_SENIOR_MANAGER':
      case 'REJECTED_FINANCE_EXPERT':
        return [];
      case 'PENDING_FINANCE_EXPERT': {
        return this.financeExpertsIds;
      }
      case 'PENDING_MANAGER':
        return [submitter.getManager()];
      case 'PENDING_SENIOR_MANAGER':
        const manager = this.employees.get(submitter.getManager());
        return [manager.getManager()];
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

  private getExpense(expenseId: string) {
    const expense = this.expenses.get(expenseId);
    if (!expense) {
      throw new Error('Error: expense not found');
    }
    return expense;
  }

  private validateSubmitter(submitterUid: number) {
    const submitter = this.employees.get(submitterUid);
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
