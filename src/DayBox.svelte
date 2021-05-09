<script lang="ts">
  import DayBoxOrg from "./DayBoxOrg.svelte";
  import type { Organizer, TrackWithDetails } from "./interfaces";
  import { fi } from "date-fns/locale";
  import { format } from "date-fns";
  import { districtFilter } from "./stores";

  export let date: Date;
  export let data: {
    [oid: string]: TrackWithDetails[];
  };
  export let organizers: {
    [oid: string]: Organizer;
  };
  let filteredData = data;
  $: if (!!$districtFilter.length) {
    filteredData = {};
    for (const k of Object.keys(data)) {
      if ($districtFilter.some((d) => organizers[k].district === d)) {
        filteredData[k] = data[k];
      }
    }
  } else {
    filteredData = data;
  }
</script>

<div class="daybox" class:collapse={!Object.keys(filteredData).length}>
  <div class="date-container">
    <h4>
      {format(date, 'cccc dd.MM.yyyy', { locale: fi }).toLocaleUpperCase()}
    </h4>
  </div>
  {#each Object.keys(filteredData) as oId (oId)}
    <DayBoxOrg organizer={organizers[oId]} tracks={data[oId]} />
  {/each}
</div>

<style>
  h4 {
    padding: 0.25rem 0;
    margin: 0;
    color: #44617c;
  }
  .daybox {
    margin: 0 auto 0.5rem auto;
    width: 100%;
    background-color: #dce9f4;
    filter: drop-shadow(2px 4px 2px #ccc);
  }
  .collapse {
    display: none;
  }
  .date-container {
    margin-top: 0;
  }
</style>
