<script lang="ts">
  import MonthLane from "./MonthLane.svelte";
  import { selectedDate, previousDate, nextDate } from "./stores";
  import MonthPicker from "./MonthPicker.svelte";
  import { format } from "date-fns";
  import { flip } from "svelte/animate";
  import { fade } from "svelte/transition";
  import FilterOptions from "./FilterOptions.svelte";

  /**
   * Maybe data like
   * organizers: [{id: 123, ...}, ...],
   * tracks: {
   * 	[datekey]: {
   * 		123: [track, ...]
   * 	}
   * }
   */
  let dates: Array<{ key: string; date: Date }>;
  $: {
    dates = [$previousDate, $selectedDate, $nextDate].map((d) => ({
      key: format(d, "yyyyMM"),
      date: d,
    }));
  }
  let showFilters;
</script>

<main>
  <div class="header">
    <div class="logo"><img src="./favicon.png" alt="SAGI Logo" /></div>

    <div class="month-picker">
      <MonthPicker bind:value={$selectedDate} />
    </div>

    <div>
      <button
        type="button"
        on:click={() => (showFilters = !showFilters)}
        class="showHideButton">
        {#if showFilters}Piilota valinnat{:else}Valitse kennelpiirit{/if}
      </button>
    </div>
    <div class="spanAll">
      <FilterOptions bind:showFilters />
    </div>
  </div>
  <div class="info">
    Muutokset jo hyväksyttyjen kisojen tietoihin eivät tällä hetkellä päivity
    anomuskalenteriin! Katso ajantasaiset tiedot
    <a
      href="https://kitu.agilityliitto.fi/#/race-calendar">kilpailukalenterista.</a>
  </div>
  <div class="event-container">
    {#each dates as d (d.key)}
      <div animate:flip={{ duration: 100 }} in:fade>
        <MonthLane selectedDate={d.date} />
      </div>
    {/each}
  </div>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    margin: 0 auto;
  }

  .event-container {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
  }

  .header {
    display: grid;
    grid-template-columns: 1fr minmax(350px, 1fr) 1fr;
    align-items: center;
  }

  .event-container > div {
    margin: 0;
  }
  .spanAll {
    grid-column: 1 / 4;
  }

  .info {
    background: #dce9f4;
    padding: 8px;
    border-radius: 4px;
  }

  @media (max-width: 640px) {
    .header,
    .event-container {
      grid-template-columns: 1fr;
    }
    .event-container > *:first-child,
    .event-container > *:last-child {
      display: none;
    }
    .logo {
      display: none;
    }
    .spanAll {
      grid-column: auto;
    }
  }
</style>
