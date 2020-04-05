import * as dateFns from "date-fns";
import { ApplicationState, Race, Track } from "./state/raceState";


const apiUrl = process.env.REACT_APP_APIURL;

console.log(apiUrl);


export const REQUEST_ERROR = Symbol("REQUEST_ERROR");
export const DATA_ERROR = Symbol("DATA_ERROR");

const PAGE_SIZE = 100;
interface RequestParams {
    clubId?: number;
    state?: ApplicationState;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    size?: number;
}
async function apiRequest({
    clubId,
    state,
    fromDate,
    toDate,
    page,
    size = PAGE_SIZE
}: RequestParams) {
    let paramString = '';
    paramString += clubId ? `&clubId=${clubId}` : '';
    paramString += state ? `&state=${state}` : '';
    paramString += fromDate ? `&fromDate=${dateFns.formatISO(fromDate, { representation: 'date' })}` : '';
    paramString += toDate ? `&toDate=${dateFns.formatISO(toDate, { representation: 'date' })}` : '';
    paramString += page ? `&page=${page}` : '';
    paramString += size ? `&size=${size}` : '';
    paramString = paramString.slice(1);

    try {
        const response = await fetch(`${apiUrl}race-applications?${paramString}`,
            {
                // headers: {
                //     'Content-Type': 'application/json'
                // }
            }
        )
        if (!response.ok) {
            return REQUEST_ERROR;
        }
        try {
            return response.json() as Promise<APIRace[]>;
        } catch (e) {
            console.log(e);
            return DATA_ERROR;
        }
    } catch (e) {
        console.log(e);
        return REQUEST_ERROR;
    }
}

type ADate = [number, number, number];
interface APITrack extends Track {
    startDate: ADate
}

interface APIRace extends Race {
    tracks: APITrack[];
};

export class RaceDataAPI {
    // private races: Race[] = [];
    private error?: typeof DATA_ERROR | typeof REQUEST_ERROR;

    public async fetchRacesForDate(date: Date) {
        const races: Race[] = [];
        const toDate = dateFns.lastDayOfMonth(date);
        const fromDate = dateFns.startOfMonth(date);
        let response = await apiRequest({ fromDate, toDate });
        if (response === DATA_ERROR || response === REQUEST_ERROR) {
            console.log("Oops");
            this.error = response;
            return;
        }
        races.push(...response.map(race => ({
            ...race, tracks: race.tracks.map(({ startDate: [y, m, d] = [0, 0, 0], ...rest }) => ({
                ...rest,
                trackDate: new Date(y, m - 1, d)
            }))
        })));

        if (response.length === PAGE_SIZE) {
            let page = 0;
            while (response.length) {
                response = await apiRequest({ fromDate, toDate, page: ++page });
                if (response === DATA_ERROR || response === REQUEST_ERROR) {
                    console.log("Oops 2");
                    this.error = response;
                    return;
                }
                races.push(...response);
            }
        }

        return races;
    }

    public hasError() { return this.error; }

    // public async getRacesForDate(date: Date) {
    //     // TODO: Return immediately if
    //     await this.fetchRacesForDate(date);
    //     return this.races.filter(race =>
    //         race.tracks.some(({ trackDate }) =>
    //             dateFns.isSameMonth(trackDate, date)
    //         ));
    // }
}