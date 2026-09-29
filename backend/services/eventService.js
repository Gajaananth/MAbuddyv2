import { EventEmitter } from 'events';
export var KaruppuEvent;
(function (KaruppuEvent) {
    KaruppuEvent["WEEKLY_MISSIONS_CREATED"] = "WEEKLY_MISSIONS_CREATED";
    KaruppuEvent["TASK_GENERATED"] = "TASK_GENERATED";
    KaruppuEvent["OPPORTUNITY_DETECTED"] = "OPPORTUNITY_DETECTED";
    KaruppuEvent["TREND_UPDATED"] = "TREND_UPDATED";
    KaruppuEvent["SECURITY_EVENT_LOGGED"] = "SECURITY_EVENT_LOGGED";
    KaruppuEvent["RAID_COMPLETED"] = "RAID_COMPLETED";
})(KaruppuEvent || (KaruppuEvent = {}));
class EventService extends EventEmitter {
    static instance;
    constructor() {
        super();
        this.setMaxListeners(20);
        console.log('[EventService] Karuppu Event Bus Initialized.');
    }
    static getInstance() {
        if (!EventService.instance) {
            EventService.instance = new EventService();
        }
        return EventService.instance;
    }
    /**
     * Broadcast an event to the system and log it synchronously for traceability.
     */
    emitKaruppu(event, data) {
        console.log(`[EventBus] EMIT: ${event}`, JSON.stringify(data).substring(0, 200));
        this.emit(event, data);
        // Auto-hook into the security audit trail for critical event types
        if (event === KaruppuEvent.SECURITY_EVENT_LOGGED) {
            // This is usually handled by the caller, but extra internal logic can go here.
        }
    }
}
export const eventService = EventService.getInstance();
