import { readFile } from 'fs/promises';
import path, { dirname } from 'path';
import { env } from 'process';
import { fileURLToPath } from 'url';
import { System } from './approvalFlow.js';
import { Employee } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// NOTE: This file is an example of how to use the System of Approval Flow.
// It is using the 'users.json' file to load the employees.
// It is not a test file, but it is used to test the System class.
// Read the tests in the 'tests' folder to see how to use the System class.

// Create a new System instance with a threshold of 1000 (as example). This value can be changed.
//TODO: validate the threshold value and its existence in the environment variables. Make these validations inside the System class.
const threshold = env.THRESHOLD ? Number(env.THRESHOLD) : 1000;
//TODO: do the same with the users.json file, pass in the env. Also in System class. new System(threshold, usersJsonPath);
const system = new System(threshold);

// Load employees from json file
//TODO: load employees from the system instead of here
await loadEmployees(system);

//TODO: validate the employees data (zod) and put this function in System class
export async function loadEmployees(system: System) {
  const employeesJson = await readFile(path.join(__dirname, '../src/input/users.json'), 'utf-8');
  const employeesData = JSON.parse(employeesJson);
  const employees = employeesData.map(
    (emp) => new Employee(emp.uid, emp.email, emp.manager, emp.role)
  );
  system.setEmployees(employees);
}
