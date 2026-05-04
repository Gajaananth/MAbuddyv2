export const allocateTime = (availableHours: number, tasks: any[]) => {
    // Mock algorithm for time allocation
    return tasks.map(t => ({ ...t, allocated_hours: 1 }));
};

export const prioritizeTasks = (tasks: any[]) => {
    // Basic prioritization
    return tasks.sort((a, b) => b.score - a.score);
};

export const dropLowValueTasks = (tasks: any[], threshold: number) => {
    return tasks.filter(t => t.score >= threshold);
};

export const optimizeResourcesDaily = (tasks: any[], availableHours: number) => {
    const highValue = dropLowValueTasks(tasks, 5);
    const sorted = prioritizeTasks(highValue);
    
    return {
        top_3_priorities: sorted.slice(0, 3),
        avoid_today: tasks.filter(t => t.score < 5).slice(0, 5),
        estimated_focus_return: sorted.slice(0, 3).reduce((acc, curr) => acc + curr.score, 0) * 1.5
    };
};
