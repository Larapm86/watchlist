import { writable } from 'svelte/store';

/** When true, show the full-screen Kinoline loading overlay after sign in / sign up. */
export const showAuthLoadingScreen = writable(false);
