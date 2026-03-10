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
	<!-- Popcorn bucket: trapezoid with curved top -->
	<path d="M7 9 5 21h14l-2-12" />
	<path d="M7 9c0-2 2.5-4 5-4s5 2 5 4" />
</svg>
