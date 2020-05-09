import * as React from "react";
import { Provider } from "overmind-react";
import { format, addMonths, getMonth, getYear } from "date-fns";
import { fi as locale } from "date-fns/locale";
import "./App.css";

import { MonthListView } from "./RaceListView";

import { DatePicker } from "./DatePicker";
import { overmind, useOvermind } from "./state/state";
import { Button } from "antd";
import { DoubleLeftOutlined, DoubleRightOutlined } from "@ant-design/icons";
import { cap } from "./utils";

const TODAY = new Date();
const DateInput: React.FC = () => {
  const { state, actions } = useOvermind();
  return (
    <div style={{ alignSelf: "center" }}>
      <Button onClick={() => actions.scrollMonth(-1)}>
        <DoubleLeftOutlined />
      </Button>
      <DatePicker
        picker="month"
        onChange={(mDate) => mDate && actions.setSelectedDate(mDate)}
        value={state.selectedDate}
        defaultValue={TODAY}
        allowClear={false}
      />
      <Button onClick={() => actions.scrollMonth(1)}>
        <DoubleRightOutlined />
      </Button>
    </div>
  );
};

const MonthHeader: React.FC<{ month: number; year: number }> = ({
  month,
  year,
}) => {
  const trackDate = new Date(year, month);
  return (
    <h3 style={{ textAlign: "center" }}>
      {cap(format(trackDate, "LLLL yyyy", { locale }))}
    </h3>
  );
};

const TrackLane: React.FC<{
  month: number;
  year: number;
  className?: string;
}> = ({ month, year, className }) => {
  return React.useMemo(
    () => (
      <div style={{ flex: 1 }} className={className}>
        <MonthHeader month={month} year={year} />
        <MonthListView month={month} year={year} />
      </div>
    ),
    [year, month, className]
  );
};

// TODO: Why does it not work if the component is called "TrackLanes"
const TrackLanes: React.FC = () => {
  const {
    state: { selectedDate },
  } = useOvermind();

  return (
    <div className="TrackLanes">
      <TrackLane
        className="previous"
        key={format(addMonths(selectedDate, -1), "yyyyMM")}
        month={getMonth(addMonths(selectedDate, -1))}
        year={getYear(addMonths(selectedDate, -1))}
      />
      <TrackLane
        key={format(selectedDate, "yyyyMM")}
        month={getMonth(selectedDate)}
        year={getYear(selectedDate)}
      />
      <TrackLane
        className="next"
        key={format(addMonths(selectedDate, 1), "yyyyMM")}
        month={getMonth(addMonths(selectedDate, 1))}
        year={getYear(addMonths(selectedDate, 1))}
      />
    </div>
  );
};

export const App: React.FC = () => (
  <div className="App">
    <Provider value={overmind}>
      <DateInput />
      <TrackLanes />
    </Provider>
  </div>
);
