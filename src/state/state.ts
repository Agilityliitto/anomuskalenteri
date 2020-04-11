import {
  createOvermind,
  IConfig,
  Action,
  derived,
  OnInitialize,
} from "overmind";
import { createHook } from "overmind-react";
import { raceState } from "./raceState";
import { parseISO, formatISO, addMonths } from "date-fns";
import { effects } from "./effects";

declare module "overmind" {
  interface Config extends IConfig<typeof overmindConfig> {}
}

export type State = {
  race: typeof raceState;
  _date: string;
  selectedDate: Date;
  fetching: boolean;
};

const state: State = {
  race: raceState,
  _date: formatISO(new Date()),
  selectedDate: derived<State, Date>(({ _date }) => {
    return parseISO(_date);
  }),
  fetching: false,
};

const fetchRaces: Action<Date, Promise<void>> = async (
  { state, effects },
  newDate
) => {
  const races = await effects.api.fetchRacesForDate(newDate);
  if (!races) return;
  for (const race of races) {
    state.race.races[race.id] = race;
    state.race.organizers[race.details.organizer.id] = race.details.organizer;
    for (const track of race.tracks) {
      state.race.tracks[track.id] = {
        ...track,
        raceId: race.id,
        clubId: race.details.organizer.id,
      };
    }
  }
};

const setSelectedDate: Action<Date, Promise<void>> = async (
  { state, actions },
  newDate
) => {
  state._date = formatISO(newDate);
  state.fetching = true;
  try {
    await Promise.all([
      actions.fetchRaces(newDate),
      actions.fetchRaces(addMonths(newDate, -1)),
      actions.fetchRaces(addMonths(newDate, 1)),
    ]);
  } finally {
    state.fetching = false;
  }
};

const onInitialize: OnInitialize = ({ actions }) => {
  actions.setSelectedDate(new Date());
};

const overmindConfig = {
  state,
  actions: {
    setSelectedDate,
    fetchRaces,
  },
  effects,
  onInitialize,
};

export const overmind = createOvermind<typeof overmindConfig>(overmindConfig, {
  devtools: true,
});

export const useOvermind = createHook<typeof overmindConfig>();
