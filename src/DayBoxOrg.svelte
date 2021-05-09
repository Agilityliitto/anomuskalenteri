<script lang="ts">
  import type { Organizer, TrackWithDetails } from "./interfaces";
  export let organizer: Organizer;
  export let tracks: TrackWithDetails[];
  const LEVELS = ["1", "2", "3", "X"] as const;
  const SIZES = ["XS", "S", "M", "SL", "L"] as const;

  // TODO: Something is breaking the reactivity here
  // judges, counts and details don't get updated
  const judges = new Set();
  const reserveJudges = new Set();
  const counts = [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ];
  let { details, location } = tracks[0];
  let status = details?.state;
  for (const track of tracks) {
    const levelIndex = LEVELS.indexOf(track.level);
    const sizeIndex = SIZES.indexOf(track.size);
    counts[levelIndex][sizeIndex] += 1;
    if (track.mainJudge) {
      judges.add(track.mainJudge);
    }
    if (track.reserveJudge) {
      reserveJudges.add(track.reserveJudge);
    }
  }
  for (const judge of judges) {
    reserveJudges.delete(judge);
  }
  // const totalCounts = counts.map((level) => {
  //     const allCount = Math.min(...level);
  //     return [allCount, ...level.map((c) => c - allCount)];
  // });

  const classStrings = counts.map((levels) => {
    const [sizeStr, acc] = levels.reduce(
      ([out, acc], cl, s) => {
        if (!cl) {
          if (acc.length < 2) {
            return [(out ? [out, ...acc] : acc).join(", "), []];
          } else
            return [
              out ? `${out}, ${acc[0]}–${acc[1]}` : `${acc[0]}–${acc[1]}`,
              [],
            ];
        }
        if (acc.length < 2) return [out, [...acc, SIZES[s]]];
        return [out, [acc[0], SIZES[s]]];
      },
      [, []] as [string, string[]]
    );
    if (sizeStr) {
      return acc.length < 2
        ? [sizeStr, ...acc].join(", ")
        : `${sizeStr}, ${acc[0]}-${acc[1]}`;
    }
    return acc.length < 2 ? acc.join("") : `${acc[0]}-${acc[1]}`;
  });

  let expanded;

  // const sortedTracks = tracks.sort((a, b) => {
  //     if (a.level < b.level) return -1;
  //     if (a.level > b.level) return 1;
  //     const aSize = SIZES.indexOf(a.size),
  //         bSize = SIZES.indexOf(b.size);
  //     return aSize - bSize;
  // });
</script>

<div class="base" on:click={() => (expanded = !expanded)}>
  {#if status === 'CLUB_DRAFT'}
    <div class="state draft" title="Kilpailua ei ole vielä anottu">Varaus</div>
  {/if}
  {#if status === 'CLUB_DONE'}
    <div class="state pending" title="Kilpailu odottaa hyväksyntää">
      Odottaa
    </div>
  {/if}

  <div class="event-container">
    {#if details.eventName}{details.eventName}{/if}
  </div>

  <div class="organizer-container">
    <abbr title={organizer.name}>{organizer.abbr}</abbr>
  </div>

  <div class="location-container" class:location>
    {#if location}
      {location.city}
    {:else if organizer.city}
      <span title="Kisapaikkaa ei määritetty">{organizer.city}</span>
    {/if}
  </div>

  <div class="names-container">
    <div>
      <div class="judges-main">
        {#each Array.from(judges) as judge}
          <div>{judge}</div>
        {/each}
      </div>
      <div class="judges-reserve" title="Varatuomarit">
        {#each Array.from(reserveJudges) as judge}
          <div>{judge}</div>
        {/each}
      </div>
    </div>
  </div>

  <div class="classes-container">
    {#each classStrings as str, i}
      {#if str}
        <div class="class-counts">
          {str}
          <span class="level-indicator">{LEVELS[i]}</span>
        </div>
      {/if}
    {/each}
  </div>

  {#if expanded && details.description}
    <div class="description-container">{details.description}</div>
  {/if}
  {#if !expanded && details.description}
    <div class="expand-hint" title="Lisätietoja klikkaamalla">
      <button type="button" title="Laajenna">&hellip;</button>
    </div>
  {/if}
</div>

<style>
  abbr {
    text-decoration: none;
    font-weight: 700;
  }
  .judges-main {
    font-size: 0.9rem;
  }
  .judges-reserve {
    font-size: 0.8rem;
    font-style: italic;
  }
  .class-counts {
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    word-spacing: 0.02em;
  }
  .base {
    position: relative;
    padding: 1rem;
    display: grid;
    border-top: 1px solid #ccc;
    background-color: #fff;
    text-align: left;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "e e"
      "o l"
      "n c";

    transition: background-color 0.5s ease;
    align-items: center;
  }
  .base:first-child {
    border-top: 0;
  }
  .base:hover {
    background-color: #ddd;
  }

  .event-container {
    grid-area: e;
    text-align: center;
    padding-bottom: 8px;
    font-size: 12px;
    color: #666;

    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .organizer-container {
    grid-area: o;
  }
  .location-container {
    grid-area: l;
    font-style: italic;
  }
  .location-container.location {
    font-style: normal;
  }
  .names-container {
    grid-area: n;
  }
  .classes-container {
    grid-area: c;
    justify-self: right;
    margin: 0;
    padding: 4px 0;
  }
  .description-container {
    grid-column: 1 / 3;
    font-size: 0.8rem;
    padding: 8px 0;

    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .state {
    position: absolute;
    writing-mode: vertical-lr;
    text-orientation: mixed;
    text-transform: uppercase;
    font-size: 10px;
    line-height: 12px;
    left: 0;
    height: 100%;
    text-align: center;
    display: block;
  }
  .draft {
    background-color: #eeb;
  }
  .pending {
    background-color: #bee;
  }
  .expand-hint {
    grid-column: 1 / 3;
    text-align: center;
  }
  .expand-hint button {
    appearance: none;
    border: 0;
    background-color: transparent;
  }
  .expand-hint button:focus {
    font-weight: 700;
    box-shadow: 0 0 2px 2px #88f;
    /* outline: 2px solid #88f; */
  }
</style>
