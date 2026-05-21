import { EventEmitter } from 'events';

export enum KaruppuEvent {
    WEEKLY_MISSIONS_CREATED = 'WEEKLY_MISSIONS_CREATED',
    TASK_GENERATED = 'TASK_GENERATED',
    OPPORTUNITY_DETECTED = 'OPPORTUNITY_DETECTED',
    TREND_UPDATED = 'TREND_UPDATED',
    SECURITY_EVENT_LOGGED = 'SECURITY_EVENT_LOGGED',
    RAID_COMPLETED = 'RAID_COMPLETED'
}

class EventService extends EventEmitter {
    private static instance: EventService;

    private constructor() {
        super();
        this.setMaxListeners(20);
        console.log('[EventService] Karuppu Event Bus Initialized.');
    }

    public static getInstance(): EventService {
        if (!EventService.instance) {
            EventService.instance = new EventService();
        }
        return EventService.instance;
    }

    /**
     * Broadcast an event to the system and log it synchronously for traceability.
     */
    public emitKaruppu(event: KaruppuEvent, data: any) {
        console.log(`[EventBus] EMIT: ${event}`, JSON.stringify(data).substring(0, 200));
        this.emit(event, data);
        
        // Auto-hook into the security audit trail for critical event types
        if (event === KaruppuEvent.SECURITY_EVENT_LOGGED) {
            // This is usually handled by the caller, but extra internal logic can go here.
        }
    }
}

export const eventService = EventService.getInstance();
