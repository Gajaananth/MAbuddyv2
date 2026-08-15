const { execSync } = require('child_process');
const cwd = 'd:/transfer/ma_buddy';
const commands = [
  'git status --short',
  'git add backend/db/authQueries.ts backend/services/authService.ts backend/tests/authDeviceRecovery.test.ts',
  'git commit -m "Fix device quota recovery for login after device rotation"',
  'git push origin main'
];
for (const cmd of commands) {
  console.log(`\n$ ${cmd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', shell: 'cmd.exe' });
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    console.error(error.status || error.message);
    process.exit(error.status || 1);
  }
}
