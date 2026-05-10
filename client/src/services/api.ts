import axios from 'axios';

const getBaseUrl = () => {
    let url = '';
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    
    if (envUrl) {
        url = envUrl;
    } else if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
        // Hard-wire to the master backend project
        url = 'https://m-abuddyv2.vercel.app/api';
    } else {
        url = 'http://localhost:3001/api';
    }
    
    // Ensure we don't return 'api/' but '/api' if relative
    if (url === 'api' || url === 'api/') return '/api';
    return url;
};

const API_BASE_URL = getBaseUrl();
console.log('%c[Zium Nova] ACTIVE_SCAN_API:', 'color: #00f2ff; font-weight: bold;', API_BASE_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token is injected by AuthContext.tsx into axios.defaults or api.defaults
// We don't need the interceptor looking at localStorage anymore for "PIN on Refresh"

export default api;

export const chatService = {
    sendMessage: (message: string, conversation_id?: string, publish_to_moltbook: boolean = false, signal?: AbortSignal, model?: string) =>
        api.post('/chat', { message, conversation_id, publish_to_moltbook, model }, { signal }),
    pollMessages: (conversation_id: string, since?: string) =>
        api.get('/chat/poll', { params: { conversation_id, since } }),
};

export const trendService = {
    analyzeTrend: (topic: string) =>
        api.post('/trends/analyze', { topic }),
    getTrends: () =>
        api.get('/trends'),
    deleteTrend: (id: string) =>
        api.delete(`/trends/${id}`),
};

export const agentService = {
    getAgents: () =>
        api.get('/agents'),
    addAgent: (agentData: { name: string; description: string; capabilities: string[] }) =>
        api.post('/agents', agentData),
    initiateAgent: (id: string) =>
        api.post(`/agents/${id}/initiate`),
};

export const memoryService = {
    getConversations: (limit = 20, offset = 0) =>
        api.get(`/memory/conversations?limit=${limit}&offset=${offset}`),
    getConversationDetail: (id: string) =>
        api.get(`/memory/conversations/${id}`),
    searchConversations: (query: string) =>
        api.get(`/memory/search?q=${encodeURIComponent(query)}`),
    deleteConversation: (id: string, permanent = false) =>
        api.delete(`/memory/conversations/${id}?permanent=${permanent}`),
    updateTitle: (id: string, title: string) =>
        api.patch(`/memory/conversations/${id}`, { title }),
    getUnreadCount: () => 
        api.get('/memory/unread-count'),
    markRead: (id: string) => 
        api.post(`/memory/conversations/${id}/read`),
    markAllRead: () => 
        api.post('/memory/read-all'),
};

export const intelligenceService = {
    getRides: (limit = 100) =>
        api.get(`/intelligence/raids?limit=${limit}`),
    getReports: (limit = 100) =>
        api.get(`/intelligence/reports?limit=${limit}`),
    triggerRide: (type: 'mid-week' | 'end-of-week' = 'mid-week') =>
        api.post('/intelligence/raid/trigger', { type }),
    getRideStatus: () =>
        api.get('/intelligence/raid/status'),
    exportReport: (reportId: string, format: 'json' | 'pdf' | 'word' = 'json') =>
        api.get(`/intelligence/reports/${reportId}/export?format=${format}`, { 
            responseType: format === 'json' ? 'json' : 'blob' 
        }),
    exportRide: (id: string, format: string = 'pdf') =>
        api.get(`/intelligence/raids/${id}/export?format=${format}`, { 
            responseType: 'blob' 
        }),
    // Helper for browser downloads to avoid hardcoded URLs in components
    downloadReport: async (id: string, format: 'pdf' | 'word' | 'json', type: 'reports' | 'raids' = 'reports') => {
        try {
            const res = type === 'reports' 
                ? await intelligenceService.exportReport(id, format as any)
                : await intelligenceService.exportRide(id, format);
            
            const blobType = format === 'pdf' ? 'application/pdf' : 
                            format === 'word' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 
                            'application/json';
            
            const blob = new Blob([res.data], { type: blobType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_${id}.${format === 'word' ? 'docx' : format}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[API] Download failed:', error);
            throw error;
        }
    },
    deleteRide: (id: string) =>
        api.delete(`/intelligence/raids/${id}`),
    deleteReport: (id: string) =>
        api.delete(`/intelligence/reports/${id}`),
    bulkDeleteRides: (ids: string[]) =>
        api.post('/intelligence/raids/bulk-delete', { ids }),
    bulkDeleteReports: (ids: string[]) =>
        api.post('/intelligence/reports/bulk-delete', { ids }),
};

export const notificationService = {
    getNotifications: (limit = 30, includeRead = true) =>
        api.get(`/notifications?limit=${limit}&include_read=${includeRead}`),
    getUnreadCount: () =>
        api.get('/notifications/unread-count'),
    markRead: (id: string) =>
        api.patch(`/notifications/${id}/read`),
    markAllRead: () =>
        api.patch('/notifications/read-all'),
    archive: (id: string) =>
        api.delete(`/notifications/${id}`),
    clearAll: () =>
        api.delete('/notifications'),
};

export const missionService = {
    getTasks: (archived = false) => api.get(`/tasks?archived=${archived}`),
    updateTask: (id: string, updates: any) => api.patch(`/tasks/${id}`, updates),
    archiveTask: (id: string, is_archived: boolean) => api.patch(`/tasks/${id}/archive`, { is_archived }),
    assignTask: (id: string, owner: string) => api.patch(`/tasks/${id}/assign`, { owner }),
    deleteTask: (id: string) => api.delete(`/tasks/${id}`),
    bulkDeleteTasks: (ids: string[]) => api.post('/tasks/bulk-delete', { ids }),
};

export const learningService = {
    getLogs: (limit = 50) => api.get(`/learning/logs?limit=${limit}`),
    getImprovements: (limit = 30) => api.get(`/learning/improvements?limit=${limit}`),
    getSummary: () => api.get('/learning/summary'),
};
