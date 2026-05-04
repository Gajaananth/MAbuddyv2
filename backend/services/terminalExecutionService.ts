import { exec } from 'child_process';
import { promisify } from 'util';
import { pool } from '../db/connection';

const execAsync = promisify(exec);

const ALLOWED_COMMANDS = [
    'git status', 'git add', 'git commit', 'git push',
    'npm install', 'npm run build', 'npm run test',
    'ls', 'pwd', 'mkdir', 'node '
];

const BLOCKED_COMMANDS = [
    'sudo', 'chmod 777', 'systemctl', 'shutdown', 'reboot', 'rm -rf /'
];

export const executeCommand = async (userId: string, command: string, workingDir: string = './') => {
    // 1. Safety Check
    const isBlocked = BLOCKED_COMMANDS.some(blocked => command.includes(blocked));
    if (isBlocked) {
        throw new Error(`Execution blocked: Command contains forbidden pattern.`);
    }

    const isAllowed = ALLOWED_COMMANDS.some(allowed => command.trim().startsWith(allowed));
    if (!isAllowed) {
        throw new Error(`Execution blocked: Command not in allowlist.`);
    }

    try {
        const { stdout, stderr } = await execAsync(command, { cwd: workingDir });
        const result = stdout || stderr;
        
        // Log execution
        await pool.query(
            `INSERT INTO execution_logs (user_id, action_type, action_data, result) VALUES ($1, $2, $3, $4)`,
            [userId, 'TERMINAL_COMMAND', JSON.stringify({ command, workingDir }), result.substring(0, 500)]
        );

        return { success: true, result };
    } catch (error: any) {
        await pool.query(
            `INSERT INTO execution_logs (user_id, action_type, action_data, result) VALUES ($1, $2, $3, $4)`,
            [userId, 'TERMINAL_COMMAND_ERROR', JSON.stringify({ command, workingDir }), error.message]
        );
        return { success: false, error: error.message };
    }
};
