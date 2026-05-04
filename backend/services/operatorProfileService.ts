interface OperatorProfile {
    skills: string[];
    goals: string[];
    preferredWorkflows?: string[];
    priorities?: string[];
    opportunityPreferences?: any;
}

// In-memory mock or simple JSON store. You might want to map this to a DB table eventually.
const profiles: Record<string, OperatorProfile> = {};

export const updateOperatorProfile = async (userId: string, profileUpdate: Partial<OperatorProfile>) => {
    if (!profiles[userId]) {
        profiles[userId] = { skills: [], goals: [] };
    }
    profiles[userId] = { ...profiles[userId], ...profileUpdate };
    return profiles[userId];
};

export const getOperatorContext = async (userId: string): Promise<OperatorProfile> => {
    return profiles[userId] || { skills: [], goals: [] };
};

export const matchOpportunityToOperator = async (userId: string, opportunity: any) => {
    const profile = await getOperatorContext(userId);
    let matchScore = 0;
    
    if (profile.skills && opportunity.required_skills) {
        const overlap = opportunity.required_skills.filter((s: string) => profile.skills.includes(s));
        matchScore += overlap.length * 2;
    }
    
    return matchScore;
};
