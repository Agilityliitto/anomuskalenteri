import { derived } from "overmind";
import { formatISO, isSameMonth, addMonths } from "date-fns";

export enum ApplicationState {
    CLUB_DRAFT = "CLUB_DRAFT",
    CLUB_DONE = "CLUB_DONE",
    SAGI_IN_PROGRESS = "SAGI_IN_PROGRESS",
    SAGI_APPROVED = "SAGI_APPROVED"
}

interface Location {
    name: string;
    street: string;
    zip: string | null;
    postOffice: string | null;
    details: string;
}

interface Person {
    name: string;
}

interface ContactPerson {
    contactDetails: {
        name: string;
    }
}

export interface Track {
    id: number;
    trackDate: Date;
    mainJudge: ContactPerson | null;
    reserveJudge: ContactPerson | null;
    sizeClass: {
        code: string;
        name: string;
    };
    levelClass: {
        code: string;
        name: string;
    }
}

interface StateTrack extends Track {
    raceId: number;
}

interface Club {
    id: number;
    name: string;
    abbreviation: string;
    city: string;
    kennelDisctrict: {
        number: string;
        name: string;
    }
}

export interface Race {
    id: number;
    applicationState: ApplicationState;
    raceSequence: string;
    location: Location;
    official: Person;

    details: {
        description: string | null;
        organizer: Club;
        eventName: string;
        championshipRace: boolean;
    }

    tracks: Track[];
}

type RaceState = {
    races: {
        [id: number]: Race
    },
    tracks: {
        [id: number]: StateTrack
    }
    organizers: {
        [id: number]: Club
    }
    tracksByDate: TracksByDate
    monthTracks: (d: number) => StateTrack[]
}

interface TracksByDate {
    [date: string]: StateTrack[];
}

export const raceState: RaceState = {
    races: {},
    tracks: {},
    organizers: {},
    tracksByDate: derived<RaceState, TracksByDate>(({ tracks }) => {
        const tracksByDate = Object.values(tracks).reduce((acc, track) => {
            const date = formatISO(track.trackDate);
            if (acc[date]) {
                acc[date].push(track);
                return acc;
            }
            return {
                ...acc,
                [date]: [track]
            }
        }, {} as TracksByDate);

        return tracksByDate;
    }),
    monthTracks: derived<RaceState, (d: number) => StateTrack[]>(({ tracksByDate }, { selectedDate }) =>
        d => Object.values(tracksByDate).flatMap(tracks => tracks.filter(t => isSameMonth(addMonths(selectedDate, d), t.trackDate)))
    ),
}