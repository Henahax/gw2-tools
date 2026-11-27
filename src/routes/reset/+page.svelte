<script lang="ts">
	import type { PageProps } from './$types';
	import resetData from './reset.json';
	import { Reset, type ResetInterval, type ResetIntervalData } from '#lib/reset/Reset.svelte.js';
	import {
		getUTCTimeForStartOfNextDay,
		getUTCTimeForStartOfNextWeek
	} from '#lib/helpers/ResetFunctions.js';
	import Interval from '#lib/components/reset/Interval.svelte';
	import { setResetClock } from '#lib/components/reset/ResetClock.js';
	import { onMount } from 'svelte';

	import Timer from '#lib/components/reset/Timer.svelte';

	let { data }: PageProps = $props();
	let reset = $derived(new Reset(resetData satisfies ResetIntervalData[], data.resetCookies));
	let clock = $state({ now: Date.now(), reloading: false });
	setResetClock(clock);
	let settingsDialog = $state<HTMLDialogElement | null>(null);
	let filter = $state('');

	// Keep the shared clock in sync for all timers.
	$effect(() => {
		const interval = setInterval(() => {
			clock.now = Date.now();
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	});

	onMount(() => {
		// Clear checks whose reset cookies have expired.
		function resetExpiredChecks() {
			for (const interval of reset.intervals) {
				for (const category of interval.categories) {
					for (const task of category.tasks) {
						if (
							task.checked &&
							!document.cookie
								.split('; ')
								.some((cookie) => cookie.startsWith(`${task.id}.${interval.interval}=`))
						) {
							task.setChecked(false, interval, category);
						}
					}
					category.syncOpenState(false);
				}
			}
		}

		function onVisibilityChange() {
			// Recheck expired cookies when the tab becomes visible.
			if (document.visibilityState === 'visible') resetExpiredChecks();
		}

		resetExpiredChecks();
		window.addEventListener('pageshow', resetExpiredChecks);
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			window.removeEventListener('pageshow', resetExpiredChecks);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});

	function openSettings() {
		settingsDialog?.showModal();
	}

	function closeSettings() {
		settingsDialog?.close();
	}

	function closeSettingsOnBackdrop(event: MouseEvent) {
		if (event.target === event.currentTarget) closeSettings();
	}
</script>

<div class="flex w-full flex-wrap items-center gap-8 self-center p-4 max-sm:flex-col">
	<div class="flex flex-col self-start">
		<div class="text-2xl">Reset Checklist</div>
		<div>choose displayed time-gated tasks</div>
	</div>

	<div class="grid grow grid-flow-col gap-4 self-end">
		<div class="flex grow justify-end gap-4">
			<div class="flex flex-col text-end">
				<div class="text-sm">{reset.intervals[0].timer}</div>
				<Timer
					targetTime={getUTCTimeForStartOfNextWeek().getTime()}
					soonTime={86400000}
					numbersShown={4}
					triggerReload={true}
				/>
			</div>
			<div class="flex flex-col text-end">
				<div class="text-sm">{reset.intervals[1].timer}</div>
				<Timer
					targetTime={getUTCTimeForStartOfNextDay().getTime()}
					soonTime={10800000}
					numbersShown={3}
					triggerReload={true}
				/>
			</div>
			<div class="flex gap-2">
				<button class="btn btn-outline" onclick={openSettings}>
					<i class="fa-solid fa-gear"></i>
					<span class="max-sm:hidden">Settings</span>
				</button>
			</div>
		</div>
	</div>
</div>

<div class="flex grow flex-col items-center self-center p-2">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
		{#each reset.intervals as interval (interval.id)}
			<Interval {interval} />
		{/each}
	</div>
</div>

<dialog
	bind:this={settingsDialog}
	class="menu fixed inset-y-0 right-0 m-0 h-dvh max-h-dvh w-full max-w-md border-l p-0 shadow-lg"
	aria-labelledby="reset-settings-title"
	onclick={closeSettingsOnBackdrop}
>
	<div class="flex h-full flex-col">
		<div class="flex flex-col gap-2 p-4">
			<div class="flex w-full items-center justify-between gap-4">
				<h2 id="reset-settings-title" class="text-xl">Displayed tasks</h2>
				<button
					type="button"
					class="btn btn-ghost btn-square"
					aria-label="Close settings"
					onclick={closeSettings}
				>
					<i class="fa-solid fa-xmark" aria-hidden="true"></i>
				</button>
			</div>
			<label class="grid gap-1 text-sm">
				<span>Search tasks</span>
				<input class="w-full" type="search" bind:value={filter} />
			</label>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto">
			<div class="flex flex-col gap-4 p-4">
				{#each reset.intervals.filter( (interval: ResetInterval) => interval.categories.some( (category) => category.tasks.some((task) => task.name
											.toLowerCase()
											.includes(filter.toLowerCase()) || (task.location && task.location
												.toLowerCase()
												.includes(filter.toLowerCase())) || (task.description && task.description
												.toLowerCase()
												.includes(filter.toLowerCase()))) ) ) as interval (interval.id)}
					<div>
						<div class="text-lg font-bold">{interval.timer}</div>
						<div class="flex flex-col gap-2">
							{#each interval.categories.filter( (category) => category.tasks.some((task) => task.name
												.toLowerCase()
												.includes(filter.toLowerCase()) || (task.location && task.location
													.toLowerCase()
													.includes(filter.toLowerCase())) || (task.description && task.description
													.toLowerCase()
													.includes(filter.toLowerCase()))) ) as category: ResetCategory (category.id)}
								<div>
									<div class="font-semibold">{category.name}</div>
									<div class="flex flex-col gap-2">
										{#each category.tasks.filter((task) => task.name
													.toLowerCase()
													.includes(filter.toLowerCase()) || (task.location && task.location
														.toLowerCase()
														.includes(filter.toLowerCase())) || (task.description && task.description
														.toLowerCase()
														.includes(filter.toLowerCase()))) as task: ResetTask (task.id)}
											<label
												class="grid grid-cols-[auto_auto_1fr] items-center gap-2 hover:brightness-125"
											>
												<input
													type="checkbox"
													bind:checked={task.display}
													onchange={(e) => task.setDisplay(e.currentTarget.checked)}
												/>
												<img
													class="size-6 rounded"
													src={task.icon}
									alt=""
													loading="lazy"
													decoding="async"
												/>
												<div class="flex flex-col text-xs">
													<div class="font-semibold">{task.name}</div>
													{#if task.description}
														<div class="text-neutral-400">{task.description}</div>
													{:else if task.location}
														<div class="flex items-center gap-1.5 text-xs text-neutral-400">
															<i class="fa-solid fa-location-dot"></i>
										{task.location}
									</div>
								{/if}
							</div>
											</label>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</dialog>

<style>
	label {
		cursor: pointer;
	}

	.menu {
		border-color: var(--card-border-color);
		background-color: var(--background-muted);
	}

	.menu::backdrop {
		background: rgb(0 0 0 / 55%);
		backdrop-filter: blur(2px);
	}

	@media (prefers-reduced-motion: reduce) {
		.menu,
		.menu::backdrop {
			transition: none;
		}
	}
</style>
