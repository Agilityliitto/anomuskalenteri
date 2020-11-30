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
    $: if (!!$districtFilter) {
        console.log($districtFilter);
        filteredData = {};
        for (const k of Object.keys(data))
            if (organizers[k].district === Number($districtFilter)) {
                filteredData[k] = data[k];
            }
    } else {
        filteredData = data;
    }
</script>

<style>
    h4 {
        margin: 0.5rem 0;
    }
    .daybox {
        margin: 0 auto 0.5rem auto;
        width: 100%;
        border: 1px solid #ccc;
        background-color: #eef;
    }
    .collapse {
        display: none;
    }
    .date-container {
        margin-top: 0;
    }
</style>

    <div class="daybox" class:collapse={!Object.keys(filteredData).length}>
        <div class="date-container">
            <h4>
                {format(date, 'cccc dd.MM.yyyy', {
                    locale: fi,
                }).toLocaleUpperCase()}
            </h4>
        </div>
        {#each Object.keys(filteredData) as oId, i}
            <DayBoxOrg organizer={organizers[oId]} tracks={data[oId]} />
        {/each}
    </div>
