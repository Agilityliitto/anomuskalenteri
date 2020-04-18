import { createOvermind, IConfig, AsyncAction, Derive } from "overmind";
import { createHook } from "overmind-react";
import { parseISO, formatISO, addMonths } from "date-fns";

declare module "overmind" {
  interface Config extends IConfig<typeof overmindConfig> {}
}

export type State = {
  _date: string;
  selectedDate: Derive<State, Date>;
};

const state: State = {
  _date: formatISO(new Date()),
  selectedDate: ({ _date }) => {
    return parseISO(_date);
  },
};

const setSelectedDate: AsyncAction<Date> = async ({ state }, newDate) => {
  state._date = formatISO(newDate);
};

const scrollMonth: AsyncAction<number> = async ({ state }, offset = 1) => {
  const newDate = addMonths(state.selectedDate, offset);
  state._date = formatISO(newDate);
};

// const onInitialize: OnInitialize = ({ actions }) => {};

const overmindConfig = {
  state,
  actions: {
    setSelectedDate,
    scrollMonth,
  },
  // onInitialize,
};

export const overmind = createOvermind<typeof overmindConfig>(overmindConfig, {
  devtools: true,
});

export const useOvermind = createHook<typeof overmindConfig>();
