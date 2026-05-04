// In-memory approval store
export interface ActionApproval {
    id: string;
    userId: string;
    actionType: string;
    context: any;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
    createdAt: Date;
}

const approvals: ActionApproval[] = [];

export const requestApproval = async (userId: string, actionType: string, context: any) => {
    const approval: ActionApproval = {
        id: Math.random().toString(36).substring(7),
        userId,
        actionType,
        context,
        status: 'PENDING_APPROVAL',
        createdAt: new Date()
    };
    approvals.push(approval);
    return approval;
};

export const approveAction = async (approvalId: string) => {
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
        approval.status = 'APPROVED';
        return approval;
    }
    throw new Error('Approval not found');
};

export const rejectAction = async (approvalId: string) => {
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
        approval.status = 'REJECTED';
        return approval;
    }
    throw new Error('Approval not found');
};

export const getPendingApprovals = async (userId: string) => {
    return approvals.filter(a => a.userId === userId && a.status === 'PENDING_APPROVAL');
};
