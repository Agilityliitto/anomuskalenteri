import * as dateFns from "date-fns";
import { ApplicationState, PartialTrack, Race } from "./types";

const apiUrl = process.env.REACT_APP_APIURL;

console.log(apiUrl);

export const REQUEST_ERROR = Symbol("REQUEST_ERROR");
export const DATA_ERROR = Symbol("DATA_ERROR");

const PAGE_SIZE = 10;
interface RequestParams {
  clubId?: number;
  state?: ApplicationState;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  size?: number;
}
type ResponseType = APIRace[] | typeof REQUEST_ERROR | typeof DATA_ERROR;
async function apiRequest({
  clubId,
  state,
  fromDate,
  toDate,
  page,
  size = PAGE_SIZE,
}: RequestParams): Promise<ResponseType> {
  let paramString = "";
  paramString += clubId ? `&clubId=${clubId}` : "";
  paramString += state ? `&state=${state}` : "";
  paramString += fromDate
    ? `&fromDate=${dateFns.formatISO(fromDate, { representation: "date" })}`
    : "";
  paramString += toDate
    ? `&toDate=${dateFns.formatISO(toDate, { representation: "date" })}`
    : "";
  paramString += page ? `&page=${page}` : "";
  paramString += size ? `&size=${size}` : "";
  paramString = paramString.slice(1);

  try {
    const response = await fetch(
      `${apiUrl}race-applications?${paramString}`,
      {}
    );
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

function isResponseOk(response: ResponseType): response is APIRace[] {
  return !(response === REQUEST_ERROR || response === DATA_ERROR);
}

type ADate = [number, number, number];
interface APITrack extends PartialTrack {
  startDate: ADate;
}

interface APIRace extends Omit<Race, "tracks"> {
  tracks: APITrack[];
}

interface RacesRequest {
  races: Race[];
  next?: () => Promise<RacesRequest>;
}

async function fetchPage(fromDate: Date, toDate: Date, page?: number) {
  const response = await apiRequest({ fromDate, toDate, page });
  if (!isResponseOk(response)) {
    throw response;
  }

  return response.map((race) => ({
    ...race,
    tracks: race.tracks.map(
      ({ startDate: [y, m, d] = [0, 0, 0], ...rest }) => ({
        ...rest,
        trackDate: new Date(y, m - 1, d),
      })
    ),
  }));
}

export async function fetchRacesForDate(
  date: Date,
  startPage: number = 0
): Promise<RacesRequest> {
  const races: Race[] = [];
  const toDate = dateFns.lastDayOfMonth(date);
  const fromDate = dateFns.startOfMonth(date);
  const response = await fetchPage(fromDate, toDate, startPage);
  races.push(...response);

  if (response.length === PAGE_SIZE) {
    return {
      races,
      next: () => fetchRacesForDate(date, ++startPage),
    };
  }

  return { races };
}
