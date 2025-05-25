import { env } from 'process';
import { System } from './approvalFlow.js';

// This is the entry point for the Approval Flow system.
// For setup instructions and usage examples, please refer to README.md in the project root.

// Initialise system with configurable threshold and users file path
const threshold = env.THRESHOLD ? Number(env.THRESHOLD) : 1000;
const usersFilePath = env.USERS_JSON_PATH ?? '../src/input/users.json';

const system = new System(threshold, usersFilePath);

// Add your approval flow logic here
// For usage examples, see tests/index.test.ts and tests/approvalFlow.test.ts
