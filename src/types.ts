import { boolean, number, object, string } from 'zod';

export const EmployeeInputSchema = object({
  uid: number().int().positive(),
  email: string(),
  manager: number().int().positive(),
  financeExpert: boolean().optional().default(false),
});

export class Expense {
  private id: string;
  private amount: number;
  private submitterUid: number;
  private status: string;
  private approvalHistory: Expense['status'][];

  constructor(
    id: string,
    amount: number,
    submitterUid: number | undefined,
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

  setStatus(status: Expense['status']) {
    this.status = status;
    this.addToApprovalHistory(status);
  }

  private addToApprovalHistory(status: Expense['status']) {
    this.approvalHistory.push(status);
  }
}

export class Employee {
  private uid: number;
  private email: string;
  private manager: number;
  private financeExpert: boolean = false;

  constructor(uid: number, email: string, manager: number, financeExpert: boolean = false) {
    this.uid = uid;
    this.email = email;
    this.manager = manager;
    this.financeExpert = financeExpert;
  }

  getUid() {
    return this.uid;
  }

  getEmail() {
    return this.email;
  }

  getManager() {
    return this.manager;
  }

  getFinanceExpert() {
    return this.financeExpert;
  }
}
