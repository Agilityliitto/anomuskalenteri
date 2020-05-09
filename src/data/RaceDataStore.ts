import { Race, Track, Club } from "./types";
import { format, isValid } from "date-fns";
import { fetchRacesForDate } from "./api";

interface RaceMap {
  [raceId: string]: Readonly<Race> | undefined;
}

interface TrackMap {
  [trackId: string]: Readonly<Track> | undefined;
}

interface ClubMap {
  [clubId: string]: Readonly<Club> | undefined;
}

interface TracksByDate {
  [dateKey: string]: Readonly<Track>[] | undefined;
}

export interface AccumulatedTrackLevelsEntry {
  [level: string]:
    | {
        level: string;
        sizes: {
          [size: string]: number;
        };
        allSizes: number;
        trackIds: number[];
      }
    | undefined;
}

interface AccumulatedClubsEntry {
  [club: string]: AccumulatedTrackLevelsEntry | undefined;
}

interface AccumulatedTracks {
  [date: string]: AccumulatedClubsEntry | undefined;
}

export const toDateKey = (date: Date) => format(date, "yyyyMMdd");
export const toMonthKey = (date: Date) => format(date, "yyyyMM");

const SIZE_CODES = ["XS", "S", "M", "SL", "L"] as const;
function reduceTrack(
  acc: AccumulatedTracks = {},
  track: Track,
  clubId: number
) {
  const dateKey = toDateKey(track.trackDate);
  const lc = track.levelClass.code;
  const sc = track.sizeClass.code;
  return mergeReducedTracks(acc, {
    [dateKey]: {
      [clubId]: {
        [lc]: {
          level: lc,
          sizes: { [sc]: 1 },
          allSizes: 0,
          trackIds: [track.id],
        },
      },
    },
  });
}

function mergeReducedTracks(to: AccumulatedTracks, from: AccumulatedTracks) {
  for (const date of Object.keys(from)) {
    const fromDate = from[date];
    if (!fromDate) continue;
    // Merge date
    if (!to[date]) {
      to[date] = fromDate;
      continue;
    }

    // TypeScript narrowing doesn't work with object access
    // https://github.com/microsoft/TypeScript/issues/10530
    const toDate = to[date]!;

    for (const clubId of Object.keys(fromDate)) {
      // Merge club
      if (!toDate[clubId]) {
        toDate[clubId] = fromDate[clubId];
        continue;
      }
      const fromClub = fromDate[clubId];
      if (!fromClub) continue;

      // TypeScript narrowing doesn't work with object access
      const toClub = toDate[clubId]!;

      for (const level of Object.keys(fromClub)) {
        // Merge individual size class
        if (!toClub[level]) {
          toClub[level] = fromClub[level];
          continue;
        }

        // Merge size counts
        const fromEntry = fromClub[level];
        if (!fromEntry) continue;
        const toEntry = toClub[level]!;

        toEntry.allSizes += fromEntry.allSizes;
        toEntry.trackIds.push(...fromEntry.trackIds);

        for (const size of Object.keys(fromEntry.sizes)) {
          toEntry.sizes[size] =
            (toEntry.sizes[size] ?? 0) + fromEntry.sizes[size];
        }

        // Coalesce any newly added all sizes
        while (SIZE_CODES.every((c) => toEntry.sizes[c])) {
          for (const size of SIZE_CODES) {
            toEntry.sizes[size] -= 1;
          }
          toEntry.allSizes += 1;
        }
      }
    }
  }
}

interface FetchHistory {
  [monthKey: string]: {
    timestamp: number;
    /**
     * This is not a promise for the data, just a promise that the data has been processed
     */
    pending: Promise<any>;
  };
}

export class RaceDataStore {
  private races: RaceMap = {};
  private tracks: TrackMap = {};
  private clubs: ClubMap = {};

  private tracksByDate: TracksByDate = {};
  private accumulatedTracks: AccumulatedTracks = {};
  private fetchHistory: FetchHistory = {};

  private _processRaces(races: Race[] = []) {
    const acc = {};

    let c0 = 0;
    const t0 = performance.now();
    for (const race of races) {
      const clubId = race.details.organizer.id;
      if (!this.clubs[clubId]) {
        this.clubs[clubId] = race.details.organizer;
      } else {
        race.details.organizer = this.clubs[clubId]!;
      }

      if (!this.races[race.id]) {
        this.races[race.id] = race;
      }

      for (const track of race.tracks) {
        let trackDateKey;
        try {
          trackDateKey = toDateKey(track.trackDate);
        } catch (e) {
          console.error(e, track);
          continue;
        }

        const stateTrack: Track = {
          ...track,
          raceId: race.id,
          clubId: clubId,
        };

        this.tracks[track.id] = stateTrack;

        if (this.tracksByDate[trackDateKey]) {
          this.tracksByDate[trackDateKey]!.push(stateTrack);
        } else {
          this.tracksByDate[trackDateKey] = [stateTrack];
        }
        reduceTrack(acc, stateTrack, clubId);
        c0++;
      }
    }
    mergeReducedTracks(this.accumulatedTracks, acc);
    console.log(`${c0} tracks in`, performance.now() - t0);
  }

  private async _fetchMonthData(date: Date) {
    let { races, next } = await fetchRacesForDate(date);
    this._processRaces(races);
    while (next) {
      ({ races, next } = await next());
      this._processRaces(races);
    }
  }

  private fetchMonth(date: Date) {
    const monthKey = toMonthKey(date);
    if (this.fetchHistory[monthKey]) {
      return this.fetchHistory[monthKey].pending;
    }
    const pending = this._fetchMonthData(date);
    this.fetchHistory[monthKey] = {
      timestamp: Date.now(),
      pending,
    };
    return pending;
  }

  /**
   * Fetch accumulated track data for day, i.e. number of tracks by club
   * @param date Day to fetch data for
   */
  public async getAccumulatedTracks(
    date: Date
  ): Promise<AccumulatedClubsEntry> {
    if (!isValid(date)) return {};
    const dateKey = toDateKey(date);
    if (this.accumulatedTracks[dateKey]) {
      return this.accumulatedTracks[dateKey]!;
    }

    await this.fetchMonth(date);
    return this.accumulatedTracks[dateKey] ?? {};
  }

  public getAccumulatedTracksSync(date: Date) {
    if (!isValid(date)) return {};
    const dateKey = toDateKey(date);
    return this.accumulatedTracks[dateKey] ?? {};
  }

  public club(clubId: string) {
    return this.clubs[clubId];
  }

  public track(trackId: string) {
    return this.tracks[trackId];
  }

  public race(raceId: string) {
    return this.races[raceId];
  }
}
