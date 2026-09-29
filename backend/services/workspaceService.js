import fs from 'fs/promises';
import { executeCommand } from './terminalExecutionService.js';
export const cloneRepo = async (userId, url, targetPath) => {
    return await executeCommand(userId, `git clone ${url} ${targetPath}`, './');
};
export const openProject = async (projectPath) => {
    const stats = await fs.stat(projectPath);
    if (!stats.isDirectory()) {
        throw new Error('Path is not a directory');
    }
    return { success: true, path: projectPath };
};
export const analyzeProjectStructure = async (userId, projectPath) => {
    return await executeCommand(userId, `ls -la`, projectPath);
};
export const editFile = async (filePath, changes) => {
    // Basic diff preview logic can be implemented here before saving
    await fs.writeFile(filePath, changes, 'utf-8');
    return { success: true, message: `File edited at ${filePath}` };
};
export const createFile = async (filePath, content) => {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true, message: `File created at ${filePath}` };
};
export const runBuild = async (userId, projectPath) => {
    return await executeCommand(userId, 'npm run build', projectPath);
};
export const runTests = async (userId, projectPath) => {
    return await executeCommand(userId, 'npm run test', projectPath);
};
