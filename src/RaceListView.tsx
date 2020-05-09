import React, { useMemo, useState, useEffect } from "react";
import { format, isValid } from "date-fns";
import { fi as locale } from "date-fns/locale";
import "antd/dist/antd.css";

import { Tag, List, Spin } from "antd";
import { AccumulatedTrackLevelsEntry } from "./data/RaceDataStore";
import { raceData } from "./data";
import { Club } from "./data/types";
import { cap } from "./utils";

/**
 * Wraps an async function into a function that returns a cancellation function.
 * When the cancellation function is called, a promise given to the parameter function is rejected.
 *
 * const fn = cancellable(async (c) => {
 *  await Promise.race([ fetchData(), c ]);
 * })
 *
 * const cancel = fn();
 *
 * cancel(); -> c rejected
 *
 * @param fn Function to wrap, (c: Promise) => ...
 */
const cancellable = (fn: (c: Promise<never>) => Promise<void>) => () => {
  let cancel: (reason: string) => void;
  const cancelPromise = new Promise<never>((_, c) => (cancel = c));
  fn(cancelPromise);
  return () => cancel("Cancelled");
};

const renderPill = (tag: string, count: number, i: number) => (
  <div key={i}>
    {count > 1 ? `${count}x ` : null}
    <Tag>{tag}</Tag>
  </div>
);

const ClubDayTracks: React.FC<{ clubId: string; date: Date }> = ({
  clubId,
  date,
}) => {
  const initialAT = raceData.getAccumulatedTracksSync(date);
  const [tracks, setTracks] = useState<AccumulatedTrackLevelsEntry>(
    initialAT[clubId] ?? {}
  );
  const [club, setClub] = useState<Club | undefined>(raceData.club(clubId));
  useEffect(
    cancellable(async (c) => {
      try {
        const accumulatedTracks = await Promise.race([
          raceData.getAccumulatedTracks(date),
          c,
        ]);
        setTracks(accumulatedTracks[clubId] ?? {});
        setClub(raceData.club(clubId));
      } catch (e) {
        console.log(e);
      }
    }),
    [date, clubId]
  );

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

  const judgesCombined = Object.values(tracks)
    .flatMap(
      (track) =>
        track?.trackIds.flatMap((tId) => {
          const track = raceData.track(String(tId));
          if (!track || !track.mainJudge) return [];

          const mJ = track.mainJudge.contactDetails.name;
          if (!track.reserveJudge) return [mJ];

          const rJ = track.reserveJudge.contactDetails.name;
          return [mJ, rJ];
        }) ?? []
    )
    .reduce(
      // Uniq
      (acc, name) => (acc.includes(name) ? acc : [name, ...acc]),
      [] as string[]
    )
    .sort()
    .join(", ");

  const race = raceData.race(
    String(
      raceData.track(String(Object.values(tracks)[0]?.trackIds[0]))?.raceId
    )
  );
  const location =
    race?.location.city ?? race?.location.postOffice ?? club.city;

  return (
    <List.Item style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>
          {club.abbreviation} ({location})
        </div>
        <div>{judgesCombined}</div>
      </div>
      <div>{pills}</div>
    </List.Item>
  );
};

const DayTracks: React.FC<{ date: number; month: number; year: number }> = ({
  date,
  month,
  year,
}) => {
  const trackDate = useMemo(() => new Date(year, month, date), [
    year,
    month,
    date,
  ]);
  const initialAT = raceData.getAccumulatedTracksSync(trackDate);
  const [clubsForDay, setClubsForDay] = useState<string[]>(
    Object.keys(initialAT)
  );
  useEffect(
    cancellable(async (c) => {
      try {
        const accumulatedTracks = await Promise.race([
          raceData.getAccumulatedTracks(trackDate),
          c,
        ]);
        setClubsForDay(Object.keys(accumulatedTracks ?? {}));
      } catch (e) {
        console.log(e);
      }
    }),
    [trackDate]
  );

  if (!isValid(trackDate)) return null;

  if (clubsForDay.length)
    return (
      <List
        header={<b>{cap(format(trackDate, "cccc dd.MM.yyyy", { locale }))}</b>}
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
  useEffect(
    cancellable(async (c) => {
      try {
        const date = new Date(year, month);
        const accumulatedTracks = raceData.getAccumulatedTracks(date);
        const race = await Promise.race([
          accumulatedTracks,
          delay(300, false),
          c,
        ]);
        if (race === false) {
          setSpinning(true);
          await Promise.race([accumulatedTracks, c]);
          setSpinning(false);
        }
      } catch (e) {
        console.log("1", e);
      }
    }),
    [month, year]
  );

  const dates = useMemo(() => {
    const _dates = [];
    for (let i = 1; i <= 31; i++) {
      _dates.push(<DayTracks year={year} month={month} date={i} key={i} />);
    }
    return _dates;
  }, [year, month]);

  return (
    <Spin spinning={spinning}>
      <div style={{ minHeight: "100px" }}>{dates}</div>
    </Spin>
  );
};
