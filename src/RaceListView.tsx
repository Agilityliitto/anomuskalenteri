import React from 'react';
import { format } from 'date-fns';
import { fi as locale } from 'date-fns/locale'
import 'antd/dist/antd.css';

import { Card, Tag, Tooltip, List } from "antd";
import { ExclamationCircleOutlined, QuestionOutlined, QuestionCircleOutlined, CheckOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Race, ApplicationState, Track } from './api';

const RaceListLine: React.FC<{ race: Race }> = ({ race }) => {
  const icon = race.details.championshipRace ? (<ExclamationCircleOutlined style={{ 'marginRight': '5px' }} />) : null;

  const tracks = race.tracks.map(track => {
    const color = track.levelClass.code === "1" ? '#77c' :
      track.levelClass.code === "2" ? '#7c7' :
        track.levelClass.code === "3" ? '#c77' : '';
    return (
      <Tag color={color}>{track.sizeClass.code}{track.levelClass.code}</Tag>
    )
  });

  const statusIcon = race.applicationState === ApplicationState.CLUB_DRAFT ? <Tooltip title={"Luonnos"}><QuestionOutlined /></Tooltip>
    : race.applicationState === ApplicationState.CLUB_DONE ? <Tooltip title={"Anomus"}><QuestionCircleOutlined /></Tooltip>
      : race.applicationState === ApplicationState.SAGI_IN_PROGRESS ? <Tooltip title={"Käsittelyssä"}><CheckOutlined /></Tooltip>
        : <Tooltip title={"Hyväksytty"}><CheckCircleOutlined /></Tooltip>;

  const title = (<div style={{ display: 'flex' }}>
    <span style={{ flex: '1' }}>{icon}{race.details.organizer.abbreviation}</span>
    <span style={{ alignSelf: "right" }}>{statusIcon}</span>
  </div>);
  return (<Card title={title}>
    {tracks}
  </Card>);
};

interface RacesByDate {
  [date: string]: RacesByClub;
}

interface RacesByClub {
  [club: string]: {
    [levelClass: string]: (Track & { race: Race })[];
  }
}

const SIZE_CODES = ['XS', 'S', 'M', 'SL', 'L'];
const DateRaceListView: React.FC<{ dateRaces: RacesByClub }> = ({ dateRaces }) => {
  const clubs = Object.keys(dateRaces);
  const clubRaces = clubs.map(club => {
    const racesByLevel = dateRaces[club];
    const races = Object.keys(racesByLevel).map(level => {
      const tracks = racesByLevel[level];
      const codes = tracks.map(track => track.sizeClass.code);

      // Combine tracks into buckets that have one of each different size
      const codeSets = codes.reduce((acc, code) => {
        const match = acc.find(array => !array.includes(code))
        if (match) match.push(code);
        else acc.push([code]);
        return acc;
      }, [] as string[][]);

      // Go through different buckets and combine sets that have all sizes in one bucket
      const combinedSets = codeSets.flatMap(set => {
        const hasAll = SIZE_CODES.every(c => set.includes(c));
        if (hasAll) {
          return [{ size: 'XS-L', level }, ...set.filter(c => !SIZE_CODES.includes(c)).map(size => ({ size, level }))];
        }
        return set.map(size => ({ size, level }))
      });

      const countedCodes = combinedSets.reduce((acc, set) => {
        if (acc[set.size]) acc[set.size].count += 1;
        else acc[set.size] = { ...set, count: 1 };
        return acc;
      }, {} as { [key: string]: { size: string, level: string, count: number } });

      return {
        codes: Object.values(countedCodes),
        date: tracks[0].trackDate
      };
    });
    const date = races[0].date;
    return {
      date,
      club,
      raceCodes: races.flatMap(r => r.codes)
    };
  })

  return (<List
    header={format(clubRaces[0].date, "cccc dd.MM.yyyy", { locale })}
    bordered
    dataSource={clubRaces}
    renderItem={item => (<List.Item style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>{item.club}</div>
      <div>
        {item.raceCodes // Sort levels in ascending order
          .sort((a, b) => a.level.charCodeAt(0) - b.level.charCodeAt(0))
          .map(({ size, level, count }, i) => <div key={i}>{count > 1 ? `${count}x ` : null}<Tag>{size} {level}</Tag></div>)
        }
      </div>
    </List.Item>)}
    style={{ margin: "5px" }}
  />)
}

export const RaceListView: React.FC<{ races: Race[] }> = ({ races }) => {
  /**
   * {
   *  "2018-01-01": {
   *    "CLUB": [ ... ]
   *  }
   * }
   */
  const racesByDate = races.reduce((acc, race) => {
    const { tracks } = race;
    for (const t of tracks) {
      const club = race.details.organizer.abbreviation;
      const date = t.trackDate.toISOString();
      const level = t.levelClass.code;
      const trackWithRace = {
        ...t,
        race
      };
      if (!acc[date]) acc[date] = { [club]: { [level]: [trackWithRace] } };
      else if (!acc[date][club]) acc[date][club] = { [level]: [trackWithRace] };
      else if (!acc[date][club][level]) acc[date][club][level] = [trackWithRace];
      else acc[date][club][level].push(trackWithRace);
    }
    return acc;
  }, {} as RacesByDate);
  const dates = Object.keys(racesByDate).sort();
  return (<div style={{ minHeight: '100px' }}>
    {dates.map((date, i) => (<DateRaceListView key={i} dateRaces={racesByDate[date]} />))}
  </div>)
};