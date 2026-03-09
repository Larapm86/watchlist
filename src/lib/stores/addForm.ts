import { writable } from 'svelte/store';

/** Message from the add-movie form (error or null when clear). Used when form lives in layout but action runs on index. */
export const addFormMessage = writable<string | null>(null);
