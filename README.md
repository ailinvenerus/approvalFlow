# Tipalti Approval Flow

A TypeScript implementation of an expense approval workflow system that manages expense submissions through a multi-level approval process. The system supports threshold-based routing, role-based permissions, and tracks approval history.

## Architecture

The system is built on three main components:

- **System**: Main class handling the approval flow logic and expense management
- **Employee**: Class representing users with their relationships
- **Expense**: Class managing expense state and approval history

### Workflow States

1. SUBMITTED
2. PENDING_MANAGER
3. PENDING_SENIOR_MANAGER (for expenses above threshold)
4. PENDING_FINANCE_EXPERT
5. APPROVED
6. REJECTED_MANAGER
7. REJECTED_SENIOR_MANAGER
8. REJECTED_FINANCE_EXPERT

## Features

- Multi-level approval workflow with dynamic routing
- Role-based permissions (Employee, Manager, Senior Manager, Finance Expert)
- Threshold-based approval paths (different flows for expenses above/below threshold)
- Expense tracking with detailed status management
- Complete approval history tracking
- Input validation using Zod schema
- Comprehensive test coverage (95%+)

## Prerequisites

- Node.js (Latest LTS version)
- npm (comes with Node.js)

## Installation

```bash
npm install
```

## Configuration

The system can be configured through environment variables:

- `THRESHOLD`: Default expense threshold (default: 1000)
- `USERS_JSON_PATH`: Path to users data file (default: '../src/input/users.json')

## Testing

Run the test suite with coverage reporting:

```bash
npm test
```

## Usage Example

The system's entry point is `src/index.ts`. You can execute the application using:

```bash
npm run start
```

### Example Implementation

```typescript
import { System } from './approvalFlow.js';

// Initialise system with threshold and users data
const system = new System(1000, '../src/input/users.json');

// Create and submit an expense
const submitterUid = 1;
const expenseId = system.createExpense(500, submitterUid);

// Start approval process
system.startApproval(expenseId, submitterUid);

// Get next approvers
const nextApprovers = system.nextApprovers(expenseId);

// Approve expense
const managerId = system.getEmployees().get(submitterUid).getManager();
system.approve(expenseId, managerId);

// Reject expense by finance expert
const financeExpertId = system.getFinanceExpertSIds()[0];
system.reject(expenseId, financeExpertId);

// Check approval flow
system.dumpFlow(expenseId);
```

## Implementation Details

### Approval Flow Rules

1. Expenses below threshold:
   - SUBMITTED → PENDING_MANAGER → PENDING_FINANCE_EXPERT → APPROVED
2. Expenses above threshold:
   - SUBMITTED → PENDING_MANAGER → PENDING_SENIOR_MANAGER → PENDING_FINANCE_EXPERT → APPROVED

### Validation Rules

- Only employees can submit expenses
- Managers and senior managers cannot submit expenses
- Approvers must be authorised for the current expense state
- Finance experts are identified by the "financeExpert" boolean field in the input JSON:
  ```json
  {
    "uid": 6,
    "email": "sergey@approve.com",
    "manager": 7,
    "financeExpert": true
  }
  ```
  Note: While all finance experts in the example data use the @approve.com domain, this is just a coincidence. The system relies on the explicit "financeExpert" field to determine roles, not email domains.

## Error Handling

The system uses explicit error messages for common scenarios:

- Invalid threshold values
- Missing or malformed user data
- Unauthorised approval attempts
- Invalid expense states
