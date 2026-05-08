import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { intelligenceService } from '../services/api';
import { useAuth } from './AuthContext';

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
    const [staleCount, setStaleCount] = useState(0);
    const { isAuthenticated } = useAuth();

    const checkStatus = useCallback(async () => {
        try {
            const res = await intelligenceService.getRideStatus();
            const data = res.data.data;

            if (data && data.status && data.status !== 'idle') {
                setRideStatus(data);

                if (data.status === 'completed' || data.status === 'failed') {
                    setRideStatus(null);
                    setIsTriggering(false);
                    setStaleCount(0);
                } else if (data.status === 'analyzing' || data.status === 'starting') {
                    // If it hasn't moved clusters in several polls, it might have timed out on the server
                    // We re-trigger to resume the next segment
                    setStaleCount(prev => {
                        const next = prev + 1;
                        if (next >= 5) { // ~15 seconds of no progress
                            console.log('[IntelligenceContext] Progress stalled. Pushing next segment...');
                            intelligenceService.triggerRide().catch(console.error);
                            return 0;
                        }
                        return next;
                    });
                }
            } else {
                setRideStatus(null);
                setStaleCount(0);
            }
        } catch (error) {
            console.error('[IntelligenceContext] Status Poll Error:', error);
        }
    }, [isTriggering, rideStatus]);

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
        if (!isAuthenticated) {
            setRideStatus(null);
            return;
        }

        // Initial check on mount or login
        checkStatus();

        let interval: ReturnType<typeof setInterval>;
        
        // Dynamic interval: 3s if active, 15s if idle (to catch background cron results)
        const pollRate = (isTriggering || (rideStatus && rideStatus.status !== 'idle' && rideStatus.status !== 'completed')) 
            ? 3000 
            : 15000;

        interval = setInterval(checkStatus, pollRate);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTriggering, rideStatus, checkStatus, isAuthenticated]);

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
