<script lang="ts">
    import {
        getYear,
        getMonth,
        lastDayOfYear,
        set,
        eachMonthOfInterval,
        format,
        addMonths,
    } from "date-fns";
    import { fi } from "date-fns/locale";
    import { capitalize } from "./util";

    export let value: Date;

    $: yearValue = getYear(value);
    $: monthValue = getMonth(value);

    const firstMonth = set(value, {
        date: 1,
        month: 0,
    });
    const lastMonth = lastDayOfYear(value);
    const months = eachMonthOfInterval({
        start: firstMonth,
        end: lastMonth,
    }).map((d) =>
        capitalize(
            format(d, "LLLL", {
                locale: fi,
            })
        )
    );

    function nextMonth() {
        value = addMonths(value, 1);
    }

    function previousMonth() {
        value = addMonths(value, -1);
    }
    function setYear(year) {
        year = Number(year);
        if (isNaN(year) || !year) return;
        value = set(value, { year });
    }
    function setMonth(month) {
        month = Number(month);
        if(isNaN(month)) return;
        value = set(value, { month });
    }
</script>

<style>
    input {
        width: 4.5em;
    }
    .base {
        display: inline-block;
    }
</style>

<div class="base">
    <button
        title="Edellinen"
        type="button"
        on:click={previousMonth}>&lt;</button>
    <!-- no-onchange is a deprecated rule -->
    <!-- svelte-ignore a11y-no-onchange -->
    <select value={monthValue} on:change={(e) => setMonth(e.currentTarget.value)}>
        {#each months as m, i (i)}
            <option value={i}>{m}</option>
        {/each}
    </select>
    <input
        type="number"
        value={yearValue}
        on:change={(e) => setYear(e.currentTarget.value)} />
    <button title="Seuraava" type="button" on:click={nextMonth}>&gt;</button>
</div>
