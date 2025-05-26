import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Employee, EmployeeInputSchema, Expense } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class System {
  private threshold: number;
  private expenses: Map<string, Expense>;
  private employees: Map<number, Employee>;
  private financeExpertsIds: number[] = [];

  constructor(threshold: number, usersJsonPath: string) {
    if (threshold < 0) {
      throw new Error('Error: threshold must be a positive number');
    }
    this.threshold = threshold;
    this.expenses = new Map<string, Expense>();
    this.loadEmployees(this, usersJsonPath);
  }

  loadEmployees(system: System, usersJsonPath: string) {
    console.debug(`System: Loading employees from path: ${usersJsonPath}`);
    if (!usersJsonPath) {
      throw new Error('Error: usersJsonPath is not provided');
    }
    if (!usersJsonPath.endsWith('.json')) {
      throw new Error('Error: usersJsonPath must point to a JSON file');
    }
    const employeesJson = readFileSync(path.join(__dirname, usersJsonPath), 'utf-8');
    try {
      const employeesData = EmployeeInputSchema.array().parse(JSON.parse(employeesJson));
      const employees = employeesData.map(
        (emp) => new Employee(emp.uid, emp.email, emp.manager, emp.financeExpert)
      );
      system.employees = new Map(employees.map((emp) => [emp.getUid(), emp]));
      console.debug(`System: Loaded ${employeesData.length} employees`);

      const financeExpertsIds = employees
        .filter((employee) => employee.getFinanceExpert())
        .map((emp) => emp.getUid());
      system.financeExpertsIds = financeExpertsIds;
      console.debug(`System: Identified ${financeExpertsIds.length} finance experts`);
    } catch (error) {
      throw new Error('Error: input with employees is incorrect');
    }
  }

  getThreshold() {
    return this.threshold;
  }

  getExpenses() {
    return this.expenses;
  }

  getEmployees() {
    return this.employees;
  }

  getFinanceExpertsIds() {
    return this.financeExpertsIds;
  }

  // Create a new expense
  createExpense(amount: number): string {
    if (amount > 0) {
      const expense = new Expense(randomUUID(), amount, undefined, 'SUBMITTED', ['SUBMITTED']);
      this.expenses.set(expense.getId(), expense);
      return expense.getId();
    } else {
      throw new Error('Error: expense amount must be greater than 0');
    }
  }

  // Start the approval process
  startApproval(expenseId: string, submitterUid: number) {
    console.debug(`Approval: Started for expense ${expenseId} by submitter ${submitterUid}`);
    this.validateSubmitter(submitterUid);
    const expense = this.getExpense(expenseId);
    expense.setSubmitterUid(submitterUid);
    expense.setStatus('PENDING_MANAGER');
  }

  // Get the next approvers for an expense
  nextApprovers(expenseId: string): number[] {
    const expense = this.getExpense(expenseId);
    const status = expense.getStatus();
    console.debug(`Approval: Finding next approvers for expense ${expenseId} (status: ${status})`);
    const submitter = this.employees.get(expense.getSubmitterUid());
    switch (status) {
      case 'APPROVED':
      case 'REJECTED_MANAGER':
      case 'REJECTED_SENIOR_MANAGER':
      case 'REJECTED_FINANCE_EXPERT':
        return [];
      case 'PENDING_FINANCE_EXPERT': {
        const financeExperts = this.financeExpertsIds;
        return financeExperts.filter((expertId) => expertId !== submitter.getUid());
      }
      case 'PENDING_MANAGER':
        return [submitter.getManager()];
      case 'PENDING_SENIOR_MANAGER':
        const manager = this.employees.get(submitter.getManager());
        return [manager.getManager()];
      case 'SUBMITTED':
      default: {
        throw new Error('Error: no next approver found. Start the approval process first');
      }
    }
  }

  approve(expenseId: string, approverUid: number) {
    this.changeStatus(expenseId, approverUid, true);
  }

  reject(expenseId: string, approverUid: number) {
    this.changeStatus(expenseId, approverUid, false);
  }

  private changeStatus(expenseId: string, approverUid: number, approve: boolean) {
    const expense = this.getExpense(expenseId);
    const newStatus = approve
      ? StatusService.getNextApprovalStatus(expense, this.threshold)
      : StatusService.getNextRejectionStatus(expense);
    const nextApprovers = this.nextApprovers(expenseId);
    if (nextApprovers.includes(approverUid)) {
      const oldStatus = expense.getStatus();
      expense.setStatus(newStatus);
      console.debug(
        `Approval: Expense ${expenseId} ${
          approve ? 'approved' : 'rejected'
        } by ${approverUid} (${oldStatus} -> ${newStatus})`
      );
    } else {
      throw new Error(
        `Error: approver is not in authorised to ${approve ? 'approve' : 'reject'} this expense`
      );
    }
  }

  // Dump the current flow of an expense
  dumpFlow(expenseId: string) {
    const expense = this.getExpense(expenseId);
    console.debug(
      `Approval: Flow history for expense ${expenseId}: ${expense
        .getApprovalHistory()
        .join(' -> ')}`
    );
  }

  private getExpense(expenseId: string) {
    const expense = this.expenses.get(expenseId);
    if (!expense) {
      throw new Error(`Error: expense with id ${expenseId} not found`);
    }
    return expense;
  }

  private validateSubmitter(submitterUid: number) {
    const submitter = this.employees.get(submitterUid);
    if (!submitter) {
      throw new Error(`Error: submitter uid ${submitterUid} not found`);
    }
    const managerUid = submitter.getManager();
    const seniorManagerUId = this.employees.get(managerUid).getManager();
    if (submitterUid === managerUid || managerUid === seniorManagerUId) {
      throw new Error('Error: only employees can submit expenses');
    }
  }
}

class StatusService {
  static getNextApprovalStatus(expense: Expense, threshold: number) {
    const status = expense.getStatus();
    switch (status) {
      case 'PENDING_MANAGER':
        if (expense.getAmount() <= threshold) {
          return 'PENDING_FINANCE_EXPERT';
        } else {
          return 'PENDING_SENIOR_MANAGER';
        }
      case 'PENDING_SENIOR_MANAGER':
        return 'PENDING_FINANCE_EXPERT';
      case 'PENDING_FINANCE_EXPERT':
        return 'APPROVED';
      default: // should not reach this point
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
      default: // should not reach this point
        throw new Error(
          `Error: expense is in status ${status} is not in a valid state for rejection`
        );
    }
  }
}
