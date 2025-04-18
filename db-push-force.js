import { exec } from 'child_process';

// Execute drizzle-kit push with --force flag
exec('npx drizzle-kit push --force', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`${stdout}`);
});