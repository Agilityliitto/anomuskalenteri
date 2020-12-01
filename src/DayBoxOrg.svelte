<script lang="ts">
    import type { Organizer, TrackWithDetails } from "./interfaces";
    export let organizer: Organizer;
    export let tracks: TrackWithDetails[];
    const LEVELS = ["1", "2", "3", "X"] as const;
    const SIZES = ["XS", "S", "M", "SL", "L"] as const;

    const judges = new Set();
    const reserveJudges = new Set();
    const counts = [
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
    ];
    let status = tracks[0]?.details.state;
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
                            out
                                ? `${out}, ${acc[0]}-${acc[1]}`
                                : `${acc[0]}-${acc[1]}`,
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

    // const sortedTracks = tracks.sort((a, b) => {
    //     if (a.level < b.level) return -1;
    //     if (a.level > b.level) return 1;
    //     const aSize = SIZES.indexOf(a.size),
    //         bSize = SIZES.indexOf(b.size);
    //     return aSize - bSize;
    // });
</script>

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
    }
    .class-counts {
        font-size: 1rem;
        font-weight: 200;
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
            "h h"
            "n c";

        transition: background-color 0.5s ease;
    }
    .base:first-child {
        border-top: 0;
    }
    .base:hover {
        background-color: #ddd;
    }

    .organizer-container {
        grid-area: h;
    }
    .names-container {
        grid-area: n;
    }
    .classes-container {
        grid-area: c;
        align-items: center;
        margin: 0;
    }
    .draft .state {
        position: absolute;
        writing-mode: sideways-lr;
        text-orientation: mixed;
        text-transform: uppercase;
        font-size: 10px;
        line-height: 12px;
        left: 0;
        height: 100%;
        text-align: center;
        display: block;
        background-color: #eeb;
    }
    .state {
        display: none;
    }
</style>

<div class="base" class:draft={status !== 'SAGI_APPROVED'}>
    <div class="state" title="Kilpailua ei ole vielä myönnetty">Varaus</div>
    <div class="organizer-container">
        <abbr title={organizer.name}>{organizer.abbr}</abbr>
        {#if organizer.city}({organizer.city}){/if}
    </div>
    <div class="names-container">
        <div>
            <div class="judges-main">
                {#each Array.from(judges) as judge}
                    <div>{judge}</div>
                {/each}
            </div>
            <div class="judges-reserve">
                {Array.from(reserveJudges).join(', ')}
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
</div>
