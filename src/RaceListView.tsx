import React, { useMemo, useState, useEffect } from "react";
import { format, isValid } from "date-fns";
import { fi as locale } from "date-fns/locale";
import "antd/dist/antd.css";

import { Tag, List, Spin } from "antd";
import { AccumulatedTrackLevelsEntry } from "./data/RaceDataStore";
import { raceData } from "./data";
import { Club } from "./data/types";

const renderPill = (tag: string, count: number, i: number) => (
  <div key={i}>
    {count > 1 ? `${count}x ` : null}
    <Tag>{tag}</Tag>
  </div>
);

// const SIZE_CODES = ["XS", "S", "M", "SL", "L"];
const ClubDayTracks: React.FC<{ clubId: string; date: Date }> = ({
  clubId,
  date,
}) => {
  const [tracks, setTracks] = useState<AccumulatedTrackLevelsEntry>({});
  const [club, setClub] = useState<Club>();
  useEffect(() => {
    (async () => {
      const accumulatedTracks = await raceData.getAccumulatedTracks(date);
      setTracks(accumulatedTracks[clubId] ?? {});
      setClub(raceData.club(clubId));
    })();
  }, [date, clubId]);

  if (!club) return null;

  const pills = Object.keys(tracks)
    .sort()
    .map((level) => {
      const entry = tracks[level];
      const elems = [];
      if (!entry) return null;

      if (entry.allSizes) {
        elems.push(renderPill(`XS-L ${level}`, entry.allSizes, -1));
      }
      elems.push(
        ...Object.keys(entry.sizes).map((size, i) =>
          entry.sizes[size]
            ? renderPill(`${size} ${level}`, entry.sizes[size], i)
            : null
        )
      );
      return elems;
    });

  return (
    <List.Item style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>{club.abbreviation}</div>
      <div>{pills}</div>
    </List.Item>
  );
};

const DayTracks: React.FC<{ date: number; month: number; year: number }> = ({
  date,
  month,
  year,
}) => {
  const [clubsForDay, setClubsForDay] = useState<string[]>([]);
  const trackDate = useMemo(() => new Date(year, month, date), [
    year,
    month,
    date,
  ]);
  useEffect(() => {
    (async () => {
      const accumulatedTracks = await raceData.getAccumulatedTracks(trackDate);
      setClubsForDay(Object.keys(accumulatedTracks ?? {}));
    })();
  }, [trackDate]);

  if (!isValid(trackDate)) return null;

  if (clubsForDay.length)
    return (
      <List
        header={format(trackDate, "cccc dd.MM.yyyy", { locale })}
        bordered
        dataSource={clubsForDay}
        renderItem={(clubId) => (
          <ClubDayTracks clubId={clubId} date={trackDate} />
        )}
        style={{ margin: "5px" }}
      />
    );
  return null;
};
const delay = <T extends any>(time: number, value?: T) =>
  new Promise<T>((r) => setTimeout(() => r(value), time));
export const MonthListView: React.FC<{ month: number; year: number }> = ({
  month,
  year,
}) => {
  const [spinning, setSpinning] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      const date = new Date(year, month);
      const accumulatedTracks = raceData.getAccumulatedTracks(date);
      const race = await Promise.race([accumulatedTracks, delay(300, false)]);
      if (race === false) {
        setSpinning(true);
        await accumulatedTracks;
        setSpinning(false);
      }
    })();
  }, [month, year]);

  const _dates = [];
  for (let i = 1; i <= 31; i++) {
    _dates.push(<DayTracks year={year} month={month} date={i} key={i} />);
  }

  return (
    <div style={{ minHeight: "100px" }}>
      <Spin spinning={spinning}>{_dates}</Spin>
    </div>
  );
};
