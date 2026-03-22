/**
 * Global Timestamp Formatting Utility
 * Ensures consistent "Silent Beast" aesthetics across the entity grid.
 * Format: YYYY.MM.DD HH:mm
 */
export const formatTimestamp = (dateInput: string | Date | number): string => {
    if (!dateInput) return '---';
    
    const date = new Date(dateInput);
    
    // Check for invalid date
    if (isNaN(date.getTime())) return 'INVALID SIGNAL';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}.${month}.${day} ${hours}:${minutes}`;
};

/**
 * Highly granular timestamp for critical logs
 * Format: YYYY.MM.DD HH:mm:ss
 */
export const formatGranularTimestamp = (dateInput: string | Date | number): string => {
    if (!dateInput) return '---';
    
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'INVALID SIGNAL';

    const base = formatTimestamp(date);
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${base}:${seconds}`;
};
