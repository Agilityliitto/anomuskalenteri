import React from "react";
import { format, getDaysInMonth, setDate } from "date-fns";
import { fi as locale } from "date-fns/locale";
import "antd/dist/antd.css";

import { Tag, List } from "antd";
import { useOvermind } from "./state/state";

const SIZE_CODES = ["XS", "S", "M", "SL", "L"];
const ClubDayTracks: React.FC<{ clubId: number; date: Date }> = ({
  clubId,
  date,
}) => {
  const { state } = useOvermind();
  const tracks = state.race
    .tracksForClubAndDate(date, clubId)
    .map((t) => state.race.tracks[t]);

  const tracksByLevel = tracks.reduce((acc, track) => {
    if (!acc[track.levelClass.code]) {
      acc[track.levelClass.code] = [track];
    } else {
      acc[track.levelClass.code].push(track);
    }
    return acc;
  }, {} as { [level: string]: typeof tracks });

  const codes = Object.keys(tracksByLevel).flatMap((level) => {
    const tracks = tracksByLevel[level];
    const codes = tracks.map((track) => track.sizeClass.code);

    // Combine tracks into buckets that have one of each different size
    const codeSets = codes.reduce((acc, code) => {
      const match = acc.find((array) => !array.includes(code));
      if (match) match.push(code);
      else acc.push([code]);
      return acc;
    }, [] as string[][]);

    // Go through different buckets and combine sets that have all sizes in one bucket
    const combinedSets = codeSets.flatMap((set) => {
      const hasAll = SIZE_CODES.every((c) => set.includes(c));
      if (hasAll) {
        return [
          { size: "XS-L", level },
          ...set
            .filter((c) => !SIZE_CODES.includes(c))
            .map((size) => ({ size, level })),
        ];
      }
      return set.map((size) => ({ size, level }));
    });

    const countedCodes = combinedSets.reduce((acc, set) => {
      if (acc[set.size]) acc[set.size].count += 1;
      else acc[set.size] = { ...set, count: 1 };
      return acc;
    }, {} as { [key: string]: { size: string; level: string; count: number } });

    return Object.values(countedCodes);
  });

  return (
    <List.Item style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        {state.race.organizers[clubId].abbreviation}
      </div>
      <div>
        {codes // Sort levels in ascending order
          .sort((a, b) => a.level.charCodeAt(0) - b.level.charCodeAt(0))
          .map(({ size, level, count }, i) => (
            <div key={i}>
              {count > 1 ? `${count}x ` : null}
              <Tag>
                {size} {level}
              </Tag>
            </div>
          ))}
      </div>
    </List.Item>
  );
};

const DayTracks: React.FC<{ date: Date; i: number }> = ({ date, i }) => {
  const { state } = useOvermind();
  const clubsForDay = state.race.clubsForDay(date);
  if (clubsForDay.length)
    return (
      <List
        header={format(date, "cccc dd.MM.yyyy", { locale })}
        bordered
        dataSource={clubsForDay}
        renderItem={(clubId) => <ClubDayTracks clubId={clubId} date={date} />}
        style={{ margin: "5px" }}
      />
    );
  return null;
};

export const MonthListView: React.FC<{ date: Date }> = ({ date }) => {
  const monthDays = getDaysInMonth(date);
  const dates: Date[] = [];
  for (let i = 1; i <= monthDays; i++) {
    dates.push(setDate(date, i));
  }

  return (
    <div style={{ minHeight: "100px" }}>
      {dates.map((_date, i) => (
        <DayTracks date={_date} key={i} i={i} />
      ))}
    </div>
  );
};
