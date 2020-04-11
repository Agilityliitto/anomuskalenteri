import { derived } from "overmind";
import { formatISO, isSameDay } from "date-fns";

export enum ApplicationState {
  CLUB_DRAFT = "CLUB_DRAFT",
  CLUB_DONE = "CLUB_DONE",
  SAGI_IN_PROGRESS = "SAGI_IN_PROGRESS",
  SAGI_APPROVED = "SAGI_APPROVED",
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
  };
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
  };
}

interface StateTrack extends Track {
  raceId: number;
  clubId: number;
}

interface Club {
  id: number;
  name: string;
  abbreviation: string;
  city: string;
  kennelDisctrict: {
    number: string;
    name: string;
  };
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
  };

  tracks: Track[];
}

type RaceState = {
  races: {
    [id: number]: Race;
  };
  tracks: {
    [id: number]: StateTrack;
  };
  organizers: {
    [id: number]: Club;
  };
  tracksByDate: TracksByDate;
  dayTracks: (d: Date) => number[];
  clubsForDay: (d: Date) => number[];
  tracksForClubAndDate: (d: Date, c: number) => number[];
};

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
        [date]: [track],
      };
    }, {} as TracksByDate);

    return tracksByDate;
  }),

  /**
   * Return the track ids for tracks in the given day
   */
  dayTracks: derived<RaceState, (d: Date) => number[]>(
    ({ tracksByDate }) => (d) =>
      Object.values(tracksByDate).flatMap((tracks) =>
        tracks.filter((t) => isSameDay(d, t.trackDate)).map((t) => t.id)
      )
  ),
  clubsForDay: derived<RaceState, (d: Date) => number[]>(
    ({ dayTracks, tracks }) => (d) => {
      const tracksForDay = dayTracks(d).map((id) => tracks[id]);
      const clubs = tracksForDay.reduce(
        (acc, { clubId }) => acc.add(clubId),
        new Set<number>()
      );
      return Array.from(clubs.values());
    }
  ),
  tracksForClubAndDate: derived<RaceState, (d: Date, club: number) => number[]>(
    ({ tracksByDate }) => (d, club) =>
      Object.values(tracksByDate).flatMap((tracks) =>
        tracks
          .filter((t) => isSameDay(d, t.trackDate) && t.clubId === club)
          .map((t) => t.id)
      )
  ),
};
