import * as React from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { fi as locale } from 'date-fns/locale';
import './App.css';
import './sidebar.css';

// import Calendar from './Calendar'
// import Spinner from "./Spinner"
import { RaceDataAPI, Race } from './api';
import { RaceListView } from './RaceListView';
// import { DatePicker } from 'antd';

import * as dateFns from 'date-fns';
import generatePicker from 'antd/es/date-picker/generatePicker';
import { Spin } from 'antd';

const DatePicker = generatePicker<Date>({
  getWeekDay: (v: Date) => dateFns.getDay(v),
  getSecond: (v: Date) => dateFns.getSeconds(v),
  getMinute: (v: Date) => dateFns.getMinutes(v),
  getHour: (v: Date) => dateFns.getHours(v),
  getDate: (v: Date) => dateFns.getDate(v),
  getMonth: (v: Date) => dateFns.getMonth(v),
  getYear: (v: Date) => dateFns.getYear(v),
  getNow: () => new Date(),
  addYear: (v: Date, d: number) => dateFns.addYears(v, d),
  addMonth: (v: Date, d: number) => dateFns.addMonths(v, d),
  addDate: (v: Date, d: number) => dateFns.addDays(v, d),
  setYear: (v: Date, year: number) => dateFns.setYear(v, year),
  setMonth: (v: Date, month: number) => dateFns.setMonth(v, month),
  setDate: (v: Date, date: number) => dateFns.setDate(v, date),
  setHour: (v: Date, hour: number) => dateFns.setHours(v, hour),
  setMinute: (v: Date, minute: number) => dateFns.setMinutes(v, minute),
  setSecond: (v: Date, second: number) => dateFns.setSeconds(v, second),
  isAfter: (date1: Date, date2: Date) => dateFns.isAfter(date1, date2),
  isValidate: (date: Date) => dateFns.isValid(date),
  locale: {
    getWeekFirstDay: (_locale: string) => locale.options?.weekStartsOn ?? 0,
    getWeek: (_locale: string, value: Date) => dateFns.getWeekYear(value, { locale }),
    format: (_locale: string, date: Date, format: string) => dateFns.format(date,
      format
        .replace('YYYY', 'yyyy')
        .replace('DD', 'dd')
        .replace('YY', 'yy'),
      { locale }),
    /** Should only return validate date instance */
    parse: (_locale: string, text: string, formats: string[]) => {
      console.log(formats, text);
      for (const f of formats) {
        const d = dateFns.parse(text, f, new Date(), { locale });
        if (dateFns.isValid(d)) return d;
      }
      return null;
    },
    /** A proxy for getting locale with moment or other locale library */
    getShortWeekDays: (_locale: string) => [0, 1, 2, 3, 4, 5, 6].map(n => dateFns.format(dateFns.setDay(new Date(), n), 'cccccc', { locale })),
    /** A proxy for getting locale with moment or other locale library */
    getShortMonths: (_locale: string) => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => dateFns.format(dateFns.setMonth(new Date(), n), 'LLL', { locale }))
  },
});

const api = new RaceDataAPI();

export const App: React.FC = () => {
  const [date, setDate] = React.useState<Date>(new Date());
  const [races1, setRaces1] = React.useState<Race[]>([]);
  const [races2, setRaces2] = React.useState<Race[]>([]);
  const [races3, setRaces3] = React.useState<Race[]>([]);
  const [error, setError] = React.useState<boolean>(false);
  React.useEffect(() => {
    (async () => {
      setRaces1([]);
      setRaces2([]);
      setRaces3([]);
      const fetchedRaces1 = await api.getRacesForDate(subMonths(date, 1));
      const fetchedRaces2 = await api.getRacesForDate(date);
      const fetchedRaces3 = await api.getRacesForDate(addMonths(date, 1));
      setRaces1(fetchedRaces1);
      setRaces2(fetchedRaces2);
      setRaces3(fetchedRaces3);
      setError(api.hasError() !== undefined);
    })()
  }, [date])
  return (<div className="App">
    {error ? 'Oops' : null}
    <div style={{ alignSelf: 'center' }}><DatePicker
      picker="month"
      onChange={mDate => mDate && setDate(mDate)}
      value={date}
    /></div>
    <div style={{ display: 'flex', flex: 1 }}>
      <div style={{ flex: 1 }}><h3 style={{ textAlign: 'center' }}>{format(subMonths(date, 1), "LLLL yyyy", { locale })}</h3>
        <Spin spinning={!races1.length} size="large"><RaceListView races={races1} /></Spin>
      </div>
      <div style={{ flex: 1 }}><h3 style={{ textAlign: 'center' }}>{format(date, "LLLL yyyy", { locale })}</h3>
        <Spin spinning={!races1.length} size="large"><RaceListView races={races2} /></Spin>
      </div>
      <div style={{ flex: 1 }}><h3 style={{ textAlign: 'center' }}>{format(addMonths(date, 1), "LLLL yyyy", { locale })}</h3>
        <Spin spinning={!races1.length} size="large"><RaceListView races={races3} /></Spin>
      </div>
    </div>
  </div>)
}