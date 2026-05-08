import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { intelligenceService } from '../services/api';

interface RideStatus {
    status: string;
    current_cluster: string;
    clusters_completed: number;
    total_clusters: number;
}

interface IntelligenceContextType {
    rideStatus: RideStatus | null;
    isTriggering: boolean;
    triggerManualRide: (type?: 'mid-week' | 'end-of-week') => Promise<void>;
}

const IntelligenceContext = createContext<IntelligenceContextType | undefined>(undefined);

export const IntelligenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [rideStatus, setRideStatus] = useState<RideStatus | null>(null);
    const [isTriggering, setIsTriggering] = useState(false);

    const checkStatus = useCallback(async () => {
        try {
            const res = await intelligenceService.getRideStatus();
            const data = res.data.data;

            if (data && data.status && data.status !== 'idle') {
                setRideStatus(data);

                if (data.status === 'completed' || data.status === 'failed') {
                    setRideStatus(null);
                    setIsTriggering(false);
                } else if (data.status === 'analyzing') {
                    // Segmented execution: If it's stalled in 'analyzing', re-trigger to push to next segment
                    // This is the Vercel-friendly resume logic
                }
            } else {
                setRideStatus(null);
            }
        } catch (error) {
            console.error('[IntelligenceContext] Status Poll Error:', error);
        }
    }, []);

    const triggerManualRide = async (type: 'mid-week' | 'end-of-week' = 'mid-week') => {
        if (isTriggering || (rideStatus && rideStatus.status !== 'idle')) return;
        setIsTriggering(true);
        try {
            await intelligenceService.triggerRide(type);
            // Immediately poll
            await checkStatus();
        } catch (error) {
            console.error('[IntelligenceContext] Trigger Error:', error);
            setIsTriggering(false);
        }
    };

    // Global Polling Effect
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        
        if (isTriggering || (rideStatus && rideStatus.status !== 'idle' && rideStatus.status !== 'completed')) {
            interval = setInterval(checkStatus, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTriggering, rideStatus, checkStatus]);

    return (
        <IntelligenceContext.Provider value={{ rideStatus, isTriggering, triggerManualRide }}>
            {children}
        </IntelligenceContext.Provider>
    );
};

export const useIntelligence = () => {
    const context = useContext(IntelligenceContext);
    if (context === undefined) {
        throw new Error('useIntelligence must be used within an IntelligenceProvider');
    }
    return context;
};
