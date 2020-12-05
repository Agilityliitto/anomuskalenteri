<script lang="ts">
  import { districtFilter } from "./stores";

  const districts =
    //<option value="">Kennelpiiri (kaikki)</option>
    [
      { id: 1, title: "Etelä-Hämeen Kennelpiiri ry." },
      { id: 2, title: "Etelä-Pohjanmaan Kennelpiiri ry." },
      { id: 3, title: "Helsingin Seudun Kennelpiiri ry." },
      { id: 4, title: "Kainuun Kennelpiiri ry." },
      { id: 5, title: "Keski-Pohjanmaan Kennelpiiri ry." },
      { id: 6, title: "Keski-Suomen Kennelpiiri ry." },
      { id: 7, title: "Kymenläänin Kennelpiiri ry." },
      { id: 8, title: "Lapin Kennelpiiri ry." },
      { id: 9, title: "Pohjois-Hämeen Kennelpiiri ry." },
      { id: 10, title: "Pohjois-Karjalan Kennelpiiri ry." },
      { id: 11, title: "Pohjois-Pohjanmaan Kennelpiiri ry." },
      { id: 12, title: "Pohjois-Savon Kennelpiiri ry." },
      { id: 13, title: "Salpausselän Kennelpiiri ry." },
      { id: 14, title: "Satakunnan Kennelpiiri ry." },
      { id: 15, title: "Suur-Savon Kennelpiiri ry." },
      { id: 16, title: "Uudenmaan Kennelpiiri ry." },
      {
        id: 17,
        title: "Vaasan Kennelpiiri ry. - Vasa Kenneldistrikt rf.",
      },
      { id: 18, title: "Varsinais-Suomen Kennelpiiri ry." },
      { id: 19, title: "Ålands Kenneldistrikt rf." },
    ];

  export let showFilters = false;
</script>

{#if showFilters}
  <div class="district-picker">
    <label for="districtSelect">Kennelpiirit </label>
    <select id="districtSelect" bind:value={$districtFilter} multiple>
      {#each districts as d}
        <option value={d.id}>{d.title}</option>
      {/each}
    </select>
  </div>
  <div>
    {#if $districtFilter.length}
      <button
        type="button"
        on:click={() => {
          $districtFilter = [];
          showFilters = false;
        }}>Näytä kaikki</button>
    {/if}
  </div>
{/if}
{#if !showFilters && $districtFilter.length}
  <div class="spanAll">
    Näytetään kennelpiirit:
    {$districtFilter.map((k) => districts[k].title).join(', ')}
  </div>
{/if}

<style>
</style>
