export interface UserJson {
  Employees: Employee[];
}

export class Expense {
  private id: string;
  private amount: number;
  private submitterUid: number;
  private status: string;
  private approvalHistory: Expense['status'][];

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
    approvalHistory: Expense['status'][] = []
  ) {
    this.id = id;
    this.amount = amount;
    this.submitterUid = submitterUid;
    this.status = status;
    this.approvalHistory = approvalHistory;
  }

  // Getters
  getId() {
    return this.id;
  }

  getSubmitterUid() {
    return this.submitterUid;
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

  setSubmitterUid(uid: number) {
    this.submitterUid = uid;
  }

  // Setters
  setStatus(status: Expense['status']) {
    this.status = status;
    this.addToApprovalHistory(status);
  }

  // Private methods
  private addToApprovalHistory(status: Expense['status']) {
    this.approvalHistory.push(status);
  }
}

export class Employee {
  private uid: number;
  private email: string;
  //TODO: should have the reference to the manager, not the id
  private manager: number;
  private role: string;

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
  }

  getUid() {
    return this.uid;
  }

  getManager() {
    return this.manager;
  }

  getRole() {
    return this.role;
  }
}
