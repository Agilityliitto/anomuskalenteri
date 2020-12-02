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
		<div class="district-picker">
			<select bind:value={$districtFilter}>
				<option value="">Kennelpiiri (kaikki)</option>
				{#each districts as d}
				<option value={d.id}>{d.title}</option>
				{/each}
			</select>
		</div>
	</div>
	<div class="event-container">
		{#each dates as d (d.key)}
			<div animate:flip={{ duration: 100 }} in:fade>
				<MonthLane selectedDate={d.date} />
			</div>
		{/each}
	</div>
</main>
