<script lang="ts">
	import MonthLane from "./MonthLane.svelte";
	import {
		selectedDate,
		previousDate,
		nextDate,
		districtFilter,
	} from "./stores";
	import MonthPicker from "./MonthPicker.svelte";
	import { format } from "date-fns";
	import { flip } from "svelte/animate";
	import { fade } from "svelte/transition";

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
</script>

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

	.event-container > div {
		margin: 0;
	}

	@media (max-width: 640px) {
		.event-container {
			grid-template-columns: 1fr;
		}
		.event-container > *:first-child,
		.event-container > *:last-child {
			display: none;
		}
	}
</style>

<main>
	<div>
		<MonthPicker bind:value={$selectedDate} />
		<div><select bind:value={$districtFilter}>
		<option value="">Kennelpiiri (kaikki)</option>
		<option value="1">Etelä-Hämeen Kennelpiiri ry.</option>
		<option value="2">Etelä-Pohjanmaan Kennelpiiri ry.</option>
		<option value="3">Helsingin Seudun Kennelpiiri ry.</option>
		<option value="4">Kainuun Kennelpiiri ry.</option>
		<option value="5">Keski-Pohjanmaan Kennelpiiri ry.</option>
		<option value="6">Keski-Suomen Kennelpiiri ry.</option>
		<option value="7">Kymenläänin Kennelpiiri ry.</option>
		<option value="8">Lapin Kennelpiiri ry.</option>
		<option value="9">Pohjois-Hämeen Kennelpiiri ry.</option>
		<option value="10">Pohjois-Karjalan Kennelpiiri ry.</option>
		<option value="11">Pohjois-Pohjanmaan Kennelpiiri ry.</option>
		<option value="12">Pohjois-Savon Kennelpiiri ry.</option>
		<option value="13">Salpausselän Kennelpiiri ry.</option>
		<option value="14">Satakunnan Kennelpiiri ry.</option>
		<option value="15">Suur-Savon Kennelpiiri ry.</option>
		<option value="16">Uudenmaan Kennelpiiri ry.</option>
		<option value="17">
		Vaasan Kennelpiiri ry. - Vasa Kenneldistrikt rf.
		</option>
		<option value="18">Varsinais-Suomen Kennelpiiri ry.</option>
		<option value="19">Ålands Kenneldistrikt rf.</option>
		</select></div>
	</div>
	<div class="event-container">
		{#each dates as d (d.key)}
			<div animate:flip={{ duration: 100 }} in:fade>
				<MonthLane selectedDate={d.date} />
			</div>
		{/each}
	</div>
</main>
