export interface UserJson {
  Employees: Employee[];
}

export class Expense {
  private id: string;
  private amount: number;
  private submitterUid: number;
  //TODO: add this field later!!!
  private rejectedBy?: number;
  private status: string;
  private approvalHistory: Expense['status'][];
  private nextApproverId?: number;

  constructor(
    id: string,
    amount: number,
    submitterUid: number,
    status:
      | 'SUBMITTED'
      | 'PENDING_MANAGER'
      | 'PENDING_SENIOR_MANAGER'
      | 'PENDING_FINANCE_EXPERT'
      | 'APPROVED'
      | 'REJECTED_MANAGER'
      | 'REJECTED_SENIOR_MANAGER'
      | 'REJECTED_FINANCE_EXPERT',
    approvalHistory: Expense['status'][] = [],
    nextApproverId?: number
  ) {
    this.id = id;
    this.amount = amount;
    this.submitterUid = submitterUid;
    this.status = status;
    this.approvalHistory = approvalHistory;
    this.nextApproverId = nextApproverId;
  }

  // Getters
  getId() {
    return this.id;
  }

  getAmount() {
    return this.amount;
  }

  getStatus() {
    return this.status;
  }

  getApprovalHistory() {
    return this.approvalHistory;
  }

  getNextApproverId() {
    return this.nextApproverId;
  }

  // Setters
  setStatus(status: Expense['status']) {
    this.status = status;
    this.addToApprovalHistory(status);
  }

  setNextApproverId(nextApproverId?: number) {
    this.nextApproverId = nextApproverId;
  }

  // Private methods
  private addToApprovalHistory(status: Expense['status']) {
    this.approvalHistory.push(status);
  }
}

export class Employee {
  private uid: number;
  private email: string;
  private manager: number;
  private role: string;
  private pendingExpenses: string[];

  constructor(
    uid: number,
    email: string,
    manager: number,
    role: 'EMPLOYEE' | 'MANAGER' | 'SENIOR_MANAGER' | 'FINANCE_EXPERT'
  ) {
    this.uid = uid;
    this.email = email;
    this.manager = manager;
    this.role = role;
    this.pendingExpenses = [];
  }

  // Getters and Setters
  getUid() {
    return this.uid;
  }

  getManager() {
    return this.manager;
  }

  getRole() {
    return this.role;
  }

  getPendingExpenses() {
    return this.pendingExpenses;
  }

  // Flow methods
  addPendingExpense(expenseId: string) {
    if (!this.pendingExpenses.includes(expenseId)) {
      this.pendingExpenses.push(expenseId);
    }
  }

  removePendingExpense(expenseId: string) {
    this.pendingExpenses = this.pendingExpenses.filter((id) => id !== expenseId);
  }
}
