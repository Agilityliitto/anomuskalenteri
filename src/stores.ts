import { addMonths, format, getDaysInMonth, setDate, parse } from "date-fns";
import { derived, writable } from "svelte/store";
import type {
  DataStore,
  EventDetailsWithState,
  RaceEvent,
  TrackWithDetails,
} from "./interfaces";

const url = "https://agilityliitto.github.io/anomusdata/output";
const externalUrl = "https://agilityliitto.github.io/anomusdata/outputExternal";
export const districtFilter = writable([]);
export const selectedDate = writable(addMonths(new Date(), 1));
export const previousDate = derived(selectedDate, ($date) =>
  addMonths($date, -1)
);
export const nextDate = derived(selectedDate, ($date) => addMonths($date, +1));

const cache: DataStore = {
  organizers: {},
  tracks: {},
};
const keysCache = new Set();
const getData = async (month: Date) => {
  const key = format(month, "yyyyMM");
  if (keysCache.has(key)) return;

  const re = await fetch(`${url}/${key}.json`, { cache: "no-cache" });
  if (!re.ok) {
    console.log(`No data for ${key}`);
    return;
  }
  const data_min = (await re.json()) as Array<RaceEvent>;

  for (const cur of data_min) {
    const { state, tracks, details, location } = cur;
    const oId = details.organizer.id;
    (details as EventDetailsWithState).state = state;
    if (!cache.organizers[oId]) {
      cache.organizers[oId] = details.organizer;
    }
    for (const track of tracks) {
      try {
        track.date = format(
          parse(track.date, "yyyy-M-d", new Date()),
          "yyyyMMdd"
        );
      } catch (e) {
        console.error(e);
        console.error(track.date);
      }
      cache.tracks[track.date] = cache.tracks[track.date] ?? {};
      cache.tracks[track.date][oId] = cache.tracks[track.date][oId] ?? [];
      if (!cache.tracks[track.date][oId].some((t) => t.id === track.id)) {
        cache.tracks[track.date][oId] = [
          ...cache.tracks[track.date][oId],
          {
            ...track,
            details: details as EventDetailsWithState,
            location,
          },
        ];
      }
    }
  }
  keysCache.add(key);
};

let externalIndexTop = 0;
async function getExternalData(year: number) {
  const re = await fetch(`${externalUrl}/${year}.json`, { cache: "no-cache" });
  if (!re.ok) {
    console.log(`No external data for ${year}`);
  }
  const data_min = (await re.json()) as Array<{
    date: string;
    mainJudge: string;
    reserveJudges: string[];
    place: string;
    club: string;
    description: string;
  }>;
  for (const cur of data_min) {
    const currentIndex = ++externalIndexTop;
    const oId = `${-currentIndex}`;

    cache.organizers[oId] = {
      city: cur.place,
      name: cur.club,
      district: -1,
      id: -currentIndex,
      abbr: cur.club,
    };

    const parsedDate = parse(cur.date, "yyyy-M-d", new Date());
    const date = format(parsedDate, "yyyyMMdd");
    const track: TrackWithDetails = {
      date,
      details: {
        organizer: cache.organizers[oId],
        state: "EXTERNAL",
        eventName: cur.description,
      },
      id: -currentIndex,
      mainJudge: cur.mainJudge,
      reserveJudge: cur.reserveJudges.join(" / "),
      location: {
        city: cur.place,
      },
    };

    cache.tracks[track.date] = cache.tracks[track.date] ?? {};
    cache.tracks[track.date][oId] = [track];
  }
}

getExternalData(2022).catch((e) => console.error(e));
getExternalData(2023).catch((e) => console.error(e));

export const dataForMonth = async (date: Date): Promise<DataStore> => {
  await getData(date);
  const daysInMonth = getDaysInMonth(date);
  const organizers = {};
  let tracks = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dayKey = format(setDate(date, d), "yyyyMMdd");
    if (cache.tracks[dayKey]) {
      tracks[dayKey] = cache.tracks[dayKey];
      for (const oId of Object.keys(tracks[dayKey])) {
        organizers[oId] = cache.organizers[oId];
      }
    }
  }
  return {
    tracks,
    organizers,
  };
};
