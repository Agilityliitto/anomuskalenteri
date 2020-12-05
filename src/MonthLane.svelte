<script lang="ts">
  import { format, parse } from "date-fns";
  import type { DataStore } from "./interfaces";
  import DayBox from "./DayBox.svelte";
  import { fi } from "date-fns/locale";
  import { dataForMonth } from "./stores";

  export let selectedDate: Date;
  let p: Promise<Readonly<DataStore>> = dataForMonth(selectedDate);
</script>

<div class="base">
  <h3>{format(selectedDate, 'LLLL', { locale: fi })}</h3>
  {#await p}
    <p>...</p>
  {:then data}
    {#if Object.keys(data.tracks).length === 0}Tietoja ei saatavilla{/if}
    {#each Object.keys(data.tracks).sort() as date, i}
      <div>
        <DayBox
          date={parse(date, 'yyyyMMdd', 0)}
          data={data.tracks[date]}
          organizers={data.organizers} />
      </div>
    {/each}
  {/await}
</div>

<style>
  .base {
    padding: 0 0.5rem;
  }
  h3 {
    text-transform: capitalize;
  }
</style>
