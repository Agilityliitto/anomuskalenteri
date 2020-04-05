import * as React from 'react';
import { Provider } from "overmind-react";
import { format, addMonths } from 'date-fns';
import { fi as locale } from "date-fns/locale";
import './App.css';
import './sidebar.css';

// import Calendar from './Calendar'
// import Spinner from "./Spinner"
import { RaceListView } from './RaceListView';

import { Spin } from 'antd';
import { DatePicker } from './DatePicker';
import { overmind, useOvermind } from './state/state';

const DateInput: React.FC = () => {
  const { state, actions } = useOvermind();
  return (<div style={{ alignSelf: 'center' }}><DatePicker
    picker="month"
    onChange={mDate => mDate && actions.setSelectedDate(mDate)}
    value={state.selectedDate}
  /></div>);
}

const TrackLane: React.FC<{ monthOffset?: number }> = ({ monthOffset = 0 }) => {
  const { state } = useOvermind();
  const { race, selectedDate } = state;
  const monthTracks = race.monthTracks(monthOffset)

  // TODO: Pass only date to RaceListView, renbame to MonthListView or something
  const raceIds = new Set(monthTracks.map(t => t.raceId));
  const races = Array.from(raceIds).map(rId => state.race.races[rId]);
  const trackDate = addMonths(selectedDate, monthOffset)
  return (<div style={{ flex: 1 }}>
    <h3 style={{ textAlign: 'center' }}>{format(trackDate, "LLLL yyyy", { locale })}</h3>
    <Spin spinning={!monthTracks.length} size="large"><RaceListView races={races} /></Spin>
  </div>
  );
}

export const App: React.FC = () =>
  (<div className="App">
    <Provider value={overmind}>
      <DateInput />
      <div style={{ display: 'flex', flex: 1 }}>
        <TrackLane monthOffset={-1} />
        <TrackLane />
        <TrackLane monthOffset={1} />
      </div>
    </Provider>
  </div>);