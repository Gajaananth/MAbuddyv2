import { useState, useEffect } from 'react';

/**
 * Custom hook to provide a live-updating formatted date and time.
 * Returns time in the format: YYYY.MM.DD HH:mm:ss
 */
export const useLiveTime = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return {
            full: `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`,
            short: `${year}.${month}.${day} ${hours}:${minutes}`,
            dateOnly: `${year}.${month}.${day}`,
            timeOnly: `${hours}:${minutes}:${seconds}`
        };
    };

    return formatTime(time);
};
