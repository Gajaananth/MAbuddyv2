// In-memory mock or simple JSON store. You might want to map this to a DB table eventually.
const profiles = {};
export const updateOperatorProfile = async (userId, profileUpdate) => {
    if (!profiles[userId]) {
        profiles[userId] = { skills: [], goals: [] };
    }
    profiles[userId] = { ...profiles[userId], ...profileUpdate };
    return profiles[userId];
};
export const getOperatorContext = async (userId) => {
    return profiles[userId] || { skills: [], goals: [] };
};
export const matchOpportunityToOperator = async (userId, opportunity) => {
    const profile = await getOperatorContext(userId);
    let matchScore = 0;
    if (profile.skills && opportunity.required_skills) {
        const overlap = opportunity.required_skills.filter((s) => profile.skills.includes(s));
        matchScore += overlap.length * 2;
    }
    return matchScore;
};
