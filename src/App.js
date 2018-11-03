import React, { Component } from 'react';
import dateFns from "date-fns";
import './App.css';
import './sidebar.css';

import Calendar from './Calendar'
import Spinner from "./Spinner"
import Auth from "./Auth"

// import { apiUrl } from "./config"
const apiUrl = process.env.REACT_APP_APIURL;

function addOrMergeReservation(prev = [], current) {
  const existing = prev.find((val) => val.organizer.id === current.organizer.id);
  if (!existing) {
    return [...prev, current]
  }
  for (const track of current.tracks) {
    const existingTrack = existing.tracks.find((t) => t.id === track.id);
    if (existingTrack) {
      Object.assign(existingTrack, track);
    } else {
      existing.tracks.push(track);
    }
  }

  prev.sort((a, b) => {
    const aName = a.organizer.abbreviation;
    const bName = b.organizer.abbreviation;
    return aName > bName ? 1 : (aName < bName ? -1 : 0);
  });
  return prev;
}

async function getMoreData(page = 0, idToken) {
  const response = await fetch(`${apiUrl}race-applications-management/list?cacheBuster=${Date.now()}&page=${page}&size=100&sort=details.lastRegistrationWeb,desc`,
    {
      headers: {
        "Authorization": `Bearer ${idToken}`
      }
    }
  )
  if (!response.ok) {
    return [];
  }
  return response.json();
}

function renderDay(reservation, i) {
  const { abbreviation } = reservation.organizer;
  const tracks = reservation.tracks.reduce((prev, current) => {
    const { code: level } = current.details.level;
    if (!prev.find((val) => val === level)) prev.push(level)
    return prev;
  }, []);
  return <div className="event" key={i}>{`${abbreviation} (${tracks.sort().join(" ")})`}</div>;
}

function getEventsForDay(day, reservations) {
  const fmtDay = dateFns.format(day, 'YYYY-MM-DD');
  const dayReservations = reservations[fmtDay];
  return dayReservations;
}

function renderEventsCompact(dayReservations) {
  if (!dayReservations) return null;
  const rendered = dayReservations.map(renderDay);
  if (rendered.length <= 5) {
    return rendered;
  }
  const [a, b, c, d] = rendered;
  return [a, b, c, d, <div className="event" key={5}>...</div>]
}

function personName(person, placeholder) {
  return person ? person.contactDetails.name : placeholder;
}
function renderEventsFull(dayReservations) {
  return !dayReservations ? [] :
    dayReservations.map(reservation => {
      const { name: organizerName, abbreviation } = reservation.organizer;
      const { name: cityName } = reservation.city;

      const tracks = reservation.tracks.reduce((acc, track) => {
        const { level: { code: level } } = track.details;
        const { mainJudge, writeInMainJudgeName, reserveJudge, writeInReserveJudgeName } = track;
        const mainJudgeName = personName(mainJudge, writeInMainJudgeName);
        const reserveJudgeName = personName(reserveJudge, writeInReserveJudgeName);
        if (!acc.levels.find((val) => val === level)) acc.levels.push(level);
        if (mainJudgeName && !acc.judges.find((val) => val === mainJudgeName)) acc.judges.push(mainJudgeName);
        if (reserveJudgeName && !acc.judges.find((val) => val === reserveJudgeName)) acc.judges.push(reserveJudgeName);
        return acc;
      }, { levels: [], judges: [] });
      tracks.levels.sort();
      return <div className="event">
        <div className="eventTitle">{`${abbreviation} - ${cityName}`}</div>
        <div className="organizer">{organizerName}</div>
        <div className="levels">Luokat: {tracks.levels.join(", ")}</div>
        <div className="judges">Tuomarit: {tracks.judges.join(", ")}</div>
      </div>
    });
}

class App extends Component {
  state = {
    loading: false,
    idToken: "",
    reservations: {},
    firstDateSeen: "9999-01-01",
    selectedDay: new Date()
  };

  processData(data) {
    for (const event of data) {
      const { city, organizer } = event.details;
      for (const track of event.tracks) {
        if (dateFns.isBefore(event.details.lastRegistrationWeb, this.state.firstDateSeen)) {
          this.setState({ firstDateSeen: track.startDate })
        }
        this.setState(prevState => ({
          reservations: {
            ...prevState.reservations,
            [track.startDate]: addOrMergeReservation(prevState.reservations[track.startDate], {
              city,
              organizer,
              tracks: [track]
            })
          }
        }))
      }
    }
  }

  getUntilToday = async () => {
    let page = 0, gotData = true;
    const cutoff = dateFns.addMonths(new Date(), -1);
    while (!dateFns.isBefore(this.state.firstDateSeen, cutoff) && gotData) {
      const data = await getMoreData(page++, this.state.idToken);
      this.processData(data)
      gotData = data.length > 0;
    }
  }

  handleAuth = async (idToken) => {
    this.setState({ loading: true })
    this.setState({ idToken });

    await this.getUntilToday();
    this.setState({ loading: false })
  }

  // componentDidMount() {
  //   Check sessionStorage for token?
  // }

  renderAuth = () => {
    return <Auth onAuth={this.handleAuth}></Auth>
  }

  renderContent = () => {
    return (<React.Fragment>
      {this.state.loading && <Spinner />}
      < Calendar
        dayContent={(day) => <React.Fragment>{renderEventsCompact(getEventsForDay(day, this.state.reservations))}</React.Fragment>
        }
        onSelectDate={(day) => this.setState({ selectedDay: day })}
        selectedDate={this.state.selectedDay}
      />
      <div className="sidebar">
        <div className="header">{dateFns.format(this.state.selectedDay, "DD.MM.YYYY")}</div>
        <div>
          {renderEventsFull(getEventsForDay(this.state.selectedDay, this.state.reservations))}
        </div>
      </div>
    </React.Fragment>);
  }

  render() {
    return (<div className="App">
      {this.state.idToken ? this.renderContent() : this.renderAuth()}
    </div>);
  }
}

export default App;
