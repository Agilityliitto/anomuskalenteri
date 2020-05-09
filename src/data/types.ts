export interface Location {
  name: string;
  street: string;
  zip: string | null;
  postOffice: string | null;
  details: string;
  city: string;
}

export interface Person {
  name: string;
}

export interface ContactPerson {
  contactDetails: {
    name: string;
  };
}

export interface PartialTrack {
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

export interface Track extends PartialTrack {
  raceId: number;
  clubId: number;
}

export interface Club {
  id: number;
  name: string;
  abbreviation: string;
  city: string;
  kennelDisctrict: {
    number: string;
    name: string;
  };
}

export enum ApplicationState {
  CLUB_DRAFT = "CLUB_DRAFT",
  CLUB_DONE = "CLUB_DONE",
  SAGI_IN_PROGRESS = "SAGI_IN_PROGRESS",
  SAGI_APPROVED = "SAGI_APPROVED",
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

  tracks: PartialTrack[];
}
