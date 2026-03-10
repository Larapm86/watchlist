<script lang="ts">
	let { size = 18 }: { size?: number } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<!-- Clapperboard: angled top + board body -->
	<path d="M4 8v11h16V8" />
	<path d="M4 8 12 4l8 4" />
	<path d="M8 8v4M12 6v6M16 8v4" />
</svg>
