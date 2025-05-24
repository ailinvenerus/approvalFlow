import { randomUUID } from 'crypto';
import { Employee, Expense } from './types.js';

export class System {
  private threshold: number;
  //TODO: make it a map
  private expenses: Expense[];
  private employees: Employee[];

  constructor(threshold: number) {
    this.threshold = threshold;
    this.expenses = [];
    this.employees = [];
  }

  // Getters and Setters
  getThreshold() {
    return this.threshold;
  }

  getExpenses() {
    return this.expenses;
  }

  getEmployees() {
    return this.employees;
  }

  setThreshold(threshold: number) {
    this.threshold = threshold;
  }

  setEmployees(employees: Employee[]) {
    this.employees = employees;
  }

  // Create a new expense
  createExpense(amount: number, submitterUid: Employee['uid']): string {
    this.validateSubmitter(submitterUid);
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
    expense.setNextApproverId(managerId);
    manager.addPendingExpense(expenseId);
  }

  // Get the next approvers for an expense
  nextApprovers(expenseId: string): number[] {
    const expense = this.getExpense(expenseId);
    const status = expense.getStatus();
    switch (status) {
      case 'APPROVED':
      case 'REJECTED_MANAGER':
      case 'REJECTED_SENIOR_MANAGER':
      case 'REJECTED_FINANCE_EXPERT':
        return [];
      case 'PENDING_FINANCE_EXPERT': {
        const financeExperts = this.employees.filter((emp) => emp.getRole() === 'FINANCE_EXPERT');
        return financeExperts.map((emp) => emp.getUid());
      }
      default: {
        const nextApproverId = expense.getNextApproverId();
        if (nextApproverId) {
          return [nextApproverId];
        } else {
          throw new Error('Error: no next approver found. Start the approval process first');
        }
      }
    }
  }

  // Approve the expense
  approve(expenseId: string, approverUid: number) {
    const expense = this.getExpense(expenseId);
    const approver = this.getApproverFromId(approverUid);
    if (approver.getPendingExpenses().includes(expenseId)) {
      this.passToNextStepOfApproval(expense, approver);
    } else {
      throw new Error('Error: approver does not have this expense pending');
    }
  }
  //TODO: make private the right functions and methods
  passToNextStepOfApproval(expense: Expense, approver: Employee) {
    const approverRole = approver.getRole();
    let nextStatus: Expense['status'] | undefined;
    switch (approverRole) {
      case 'EMPLOYEE':
        throw new Error('Error: employee cannot approve expenses');
      case 'MANAGER':
        {
          if (expense.getAmount() < this.threshold) {
            const financeExpert = this.selectFinanceExpert();
            //TODO: PASS expense directly instead of id
            financeExpert.addPendingExpense(expense.getId());
            expense.setNextApproverId(financeExpert.getUid());
            nextStatus = 'PENDING_FINANCE_EXPERT';
          } else {
            const seniorManager = this.employees.find((emp) => emp.getRole() === 'SENIOR_MANAGER');
            if (!seniorManager) {
              throw new Error('Error: no senior manager available. Should not reach this point');
            }
            seniorManager.addPendingExpense(expense.getId());
            expense.setNextApproverId(approver.getManager());
            nextStatus = 'PENDING_SENIOR_MANAGER';
          }
        }
        break;
      case 'SENIOR_MANAGER':
        {
          const financeExpert = this.selectFinanceExpert();
          financeExpert.addPendingExpense(expense.getId());
          expense.setNextApproverId(financeExpert.getUid());
          nextStatus = 'PENDING_FINANCE_EXPERT';
        }
        break;
      case 'FINANCE_EXPERT':
        nextStatus = 'APPROVED';
        break;
      default:
        throw new Error('Error: unknown approver role');
    }
    expense.setStatus(nextStatus);
    approver.removePendingExpense(expense.getId());
  }

  // Select the finance expert with the least number of pending expenses
  selectFinanceExpert() {
    const financeExperts = this.getFinanceExperts();
    return financeExperts.reduce((minEmp, emp) =>
      emp.getPendingExpenses().length < minEmp.getPendingExpenses().length ? emp : minEmp
    );
  }

  // Reject the expense
  reject(expenseId: string, approverUid: number) {
    const expense = this.getExpense(expenseId);
    const approver = this.getApproverFromId(approverUid);
    if (approver.getPendingExpenses().includes(expenseId)) {
      this.passToRejected(expense, approver);
    } else {
      throw new Error('Error: approver does not have this expense pending');
    }
  }

  passToRejected(expense: Expense, approver: Employee) {
    const approverRole = approver.getRole();
    let nextStatus: Expense['status'] | undefined;
    switch (approverRole) {
      case 'EMPLOYEE':
        throw new Error('Error: employee cannot approve expenses');
      case 'MANAGER':
        nextStatus = 'REJECTED_MANAGER';
        break;
      case 'SENIOR_MANAGER':
        nextStatus = 'REJECTED_SENIOR_MANAGER';
        break;
      case 'FINANCE_EXPERT':
        nextStatus = 'REJECTED_FINANCE_EXPERT';
        break;
      default:
        throw new Error('Error: unknown approver role');
    }
    expense.setStatus(nextStatus);
    expense.setNextApproverId();
    approver.removePendingExpense(expense.getId());
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
