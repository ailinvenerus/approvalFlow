# Tipalti Approval Flow

A TypeScript implementation of an expense approval workflow system that manages expense submissions through a multi-level approval process.

## Features

- Multi-level approval workflow
- Role-based permissions (Employee, Manager, Senior Manager, Finance Expert)
- Threshold-based routing
- Expense tracking and status management
- Approval history tracking

## Assumptions

- Assuming only an `EMPLOYEE` can submit an expense, and not any bosses. This assumption comes from the users data from the example, since there are only 3 levels max for the hierarchy.
- Email domain `approve` is considered to belong to a member of the financial team, and the modified json reflects that.

## Prerequisites

- Node.js (Latest LTS version)
- npm (comes with Node.js)

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Run Script

To run the approval flow:

1. Modify `/src/index.ts` to create the desired approval flow scenario using the available classes and methods
2. Run the following command to execute the script:

```bash
npm run start
```

### An usage Example

```typescript
import { System } from './approvalFlow.js';
import { loadEmployees } from './index.js';

// Create a new system with expense threshold
const system = new System(1000);

// Load employee data
await loadEmployees(system);

//--- Approving an expense ---
console.info('--- Approving an expense ---');

// Create and submit an expense (to be approved)
const expenseId = system.createExpense(500, 1);

// Start the approval process for the expense
const submitterId = 1;
system.startApproval(expenseId, submitterId);

// Approve the expense by the first approver
system.approve(expenseId, system.getSubmitterFromId(submitterId).getManager());

// Dump the flow of the expense
system.dumpFlow(expenseId);

// Get list of next approvers
const nextApprovers = system.nextApprovers(expenseId);
console.info('Next Approvers:', nextApprovers);

//--- Rejecting an expense ---
console.info('--- Rejecting an expense ---');

// Create and submit an expense (to be rejected)
const submitterId2 = 3;
const expenseId2 = system.createExpense(800, submitterId2);

// Start the approval process for the second expense
system.startApproval(expenseId2, submitterId);

// Get list of next approvers
const nextApprovers2 = system.nextApprovers(expenseId2);
console.info('Next Approvers:', nextApprovers2);

// Reject the second expense by the first approver
system.reject(expenseId2, system.getSubmitterFromId(submitterId).getManager());

// Dump the flow of the second expense
system.dumpFlow(expenseId2);
```

Note: more usage examples can be found in the test files located in the `tests` folder.

## Running Tests

Run the test suite with coverage reporting:

```bash
npm test
```

This will execute all tests and generate coverage reports.
