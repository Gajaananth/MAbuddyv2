const approvals = [];
export const requestApproval = async (userId, actionType, context) => {
    const approval = {
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
export const approveAction = async (approvalId) => {
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
        approval.status = 'APPROVED';
        return approval;
    }
    throw new Error('Approval not found');
};
export const rejectAction = async (approvalId) => {
    const approval = approvals.find(a => a.id === approvalId);
    if (approval) {
        approval.status = 'REJECTED';
        return approval;
    }
    throw new Error('Approval not found');
};
export const getPendingApprovals = async (userId) => {
    return approvals.filter(a => a.userId === userId && a.status === 'PENDING_APPROVAL');
};
