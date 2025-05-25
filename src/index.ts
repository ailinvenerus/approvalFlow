import { env } from 'process';
import { System } from './approvalFlow.js';

// NOTE: This file is an example of how to use the System of Approval Flow.
// It is using the 'users.json' file to load the employees.
// This file can be used to run the system.
// Read the tests in the 'tests' folder to see how to use the System class.

// Create a new System instance with a threshold of (1000 as default) and a path to the users file to load the employees.
const threshold = env.THRESHOLD ? Number(env.THRESHOLD) : 1000;
const usersFilePath = env.USERS_JSON_PATH ?? '../src/input/users.json';

const system = new System(threshold, usersFilePath);

// Write the rest of the code here to interact with the system.
