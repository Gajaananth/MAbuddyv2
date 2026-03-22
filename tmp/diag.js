const { sqliteDb, initDatabase } = require('./backend/db/connection.js');
const { getTasks } = require('./backend/db/queries.js');
const { getAllUsers } = require('./backend/db/authQueries.js');

async function diag() {
    await initDatabase();
    const users = await getAllUsers();
    console.log('Users:', users.length);
    for (const user of users) {
        const tasks = await getTasks(user.id);
        console.log(`User ${user.id} has ${tasks.length} tasks.`);
        if (tasks.length > 0) {
            console.log('Last task:', tasks[tasks.length - 1].task_name, 'Status:', tasks[tasks.length - 1].status);
        }
    }
}

diag().catch(console.error);
