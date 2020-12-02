import { addMonths, format, getDaysInMonth, setDate, parse } from "date-fns";
import { derived, writable } from "svelte/store";
import type { DataStore, EventDetailsWithState, RaceEvent } from "./interfaces";


const url = 'https://agilityliitto.github.io/anomusdata/output'
export const districtFilter = writable('');
export const selectedDate = writable(addMonths(new Date(), 1));
export const previousDate = derived(selectedDate, $date => addMonths($date, -1));
export const nextDate = derived(selectedDate, $date => addMonths($date, +1));

const cache: DataStore = {
    organizers: {},
    tracks: {},
};
const keysCache = new Set();
const getData = async (month: Date) => {
    const key = format(month, 'yyyyMM')
    if (keysCache.has(key)) return;

    const re = await fetch(`${url}/${key}.json`);
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
                track.date = format(parse(track.date, "yyyy-M-d", new Date()), "yyyyMMdd");
            } catch (e) {
                console.error(e);
                console.error(track.date);
            }
            cache.tracks[track.date] = cache.tracks[track.date] ?? {};
            cache.tracks[track.date][oId] = cache.tracks[track.date][oId] ?? [];
            cache.tracks[track.date][oId] = [
                ...cache.tracks[track.date][oId],
                {
                    ...track,
                    details: details as EventDetailsWithState,
                    location,
                },
            ];
        }
    };
    keysCache.add(key);
}

export const dataForMonth = async (date: Date): Promise<DataStore> => {
    await getData(date);
    const daysInMonth = getDaysInMonth(date);
    const organizers = {};
    let tracks = {};
    for (let d = 1; d <= daysInMonth; d++) {
        const dayKey = format(setDate(date, d), 'yyyyMMdd');
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
}