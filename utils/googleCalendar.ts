import { CalendarEvent } from '../types';

export const fetchCalendarEvents = async (token: string): Promise<CalendarEvent[]> => {
    try {
        const timeMin = new Date();
        timeMin.setHours(0, 0, 0, 0);
        const timeMax = new Date();
        timeMax.setHours(23, 59, 59, 999);

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            console.warn("Failed to fetch calendar events. Scope might be missing.");
            return [];
        }

        const data = await response.json();
        
        return (data.items || []).map((item: any) => ({
            id: item.id,
            title: item.summary || 'Busy',
            start: new Date(item.start.dateTime || item.start.date),
            end: new Date(item.end.dateTime || item.end.date),
            color: '#4285F4', // Google Blue
            isCalendarEvent: true
        }));

    } catch (error) {
        console.error("Calendar API Error:", error);
        return [];
    }
};
