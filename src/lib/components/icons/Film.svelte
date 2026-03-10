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
	<!-- Film strip frame with sprocket holes -->
	<rect x="2" y="2" width="20" height="20" rx="2" />
	<circle cx="6" cy="6" r="1.25" fill="currentColor" />
	<circle cx="18" cy="6" r="1.25" fill="currentColor" />
	<circle cx="6" cy="18" r="1.25" fill="currentColor" />
	<circle cx="18" cy="18" r="1.25" fill="currentColor" />
</svg>
