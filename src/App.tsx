import * as React from "react";
import { Provider } from "overmind-react";
import { format, addMonths } from "date-fns";
import { fi as locale } from "date-fns/locale";
import "./App.css";

import { MonthListView } from "./RaceListView";

import { DatePicker } from "./DatePicker";
import { overmind, useOvermind } from "./state/state";
import { Spin } from "antd";

const DateInput: React.FC = () => {
  const { state, actions } = useOvermind();
  return (
    <div style={{ alignSelf: "center" }}>
      <DatePicker
        picker="month"
        onChange={(mDate) => mDate && actions.setSelectedDate(mDate)}
        value={state.selectedDate}
      />
    </div>
  );
};

const TrackLane: React.FC<{ monthOffset?: number }> = ({ monthOffset = 0 }) => {
  const {
    state: { selectedDate },
  } = useOvermind();

  const trackDate = addMonths(selectedDate, monthOffset);
  return (
    <div style={{ flex: 1 }}>
      <h3 style={{ textAlign: "center" }}>
        {format(trackDate, "LLLL yyyy", { locale })}
      </h3>
      <MonthListView date={trackDate} />
    </div>
  );
};

const LoadingStatus: React.FC = () => {
  const {
    state: { fetching },
  } = useOvermind();
  return (
    <Spin
      spinning={fetching}
      size="large"
      style={{ position: "absolute", width: "100%", top: "100px" }}
    />
  );
};

export const App: React.FC = () => (
  <div className="App">
    <Provider value={overmind}>
      <DateInput />
      <LoadingStatus />
      <div style={{ display: "flex", flex: 1 }}>
        <TrackLane monthOffset={-1} />
        <TrackLane />
        <TrackLane monthOffset={1} />
      </div>
    </Provider>
  </div>
);
