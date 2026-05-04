export const parseIntent = (prompt: string) => {
    // Mock intent parser
    if (prompt.toLowerCase().includes('help')) return 'HELP';
    if (prompt.toLowerCase().includes('run')) return 'EXECUTE';
    if (prompt.toLowerCase().includes('analyze')) return 'ANALYZE';
    return 'UNKNOWN';
};

export const extractTasks = (prompt: string) => {
    // Mock task extractor
    return prompt.split(/and|,/).map(t => t.trim()).filter(t => t.length > 0);
};

export const extractEntities = (prompt: string) => {
    // Mock entity extraction
    const entities = [];
    if (prompt.includes('urgent')) entities.push({ type: 'modifier', value: 'urgent' });
    return entities;
};

export const detectUrgency = (prompt: string) => {
    if (prompt.toLowerCase().includes('asap') || prompt.toLowerCase().includes('urgent')) {
        return 'HIGH';
    }
    return 'NORMAL';
};
