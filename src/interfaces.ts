interface BaseTrack {
    id: number;
    date: string;
    size: 'XS' | 'S' | 'M' | 'SL' | 'L';
    level: '1' | '2' | '3' | 'X';
    mainJudge: string;
    reserveJudge?: string;
}
interface AgilityTrack extends BaseTrack {
    level: '1' | '2' | '3';
}
interface GamesTrack extends BaseTrack {
    level: 'X';
}
export interface Organizer {
    id: number;
    name: string;
    abbr: string;
    district: number;
    city: string;
}
interface Location {
    city: string;
}
interface EventDetails {
    organizer: Organizer;
    eventName?: string;
    description?: string;
}
export interface RaceEvent {
    state: string;
    tracks: BaseTrack[];
    details: EventDetails;
    location?: Location;
}

export interface EventDetailsWithState extends EventDetails {
    state: string;
}
export type TrackWithDetails = (AgilityTrack | GamesTrack) & {
    details: EventDetailsWithState;
    location?: Location;
}
export interface DataStore {
    organizers: { [key: string]: Organizer };
    tracks: {
        [date: string]: {
            [oid: string]: TrackWithDetails[]
        }
    },
    loaded?: boolean;
    date?: Date;
}