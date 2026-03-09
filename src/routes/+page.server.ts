import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { watchlist } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) {
		redirect(302, '/demo/better-auth/login');
	}

	const items = await db
		.select()
		.from(watchlist)
		.where(eq(watchlist.userId, user.id))
		.orderBy(desc(watchlist.createdAt));

	return { watchlist: items };
};

export const actions: Actions = {
	add: async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401, { message: 'Not logged in' });
		}

		const formData = await event.request.formData();
		const title = formData.get('title')?.toString()?.trim();
		if (!title) {
			return fail(400, { message: 'Title is required' });
		}

		await db.insert(watchlist).values({
			userId: user.id,
			title
		});

		return {};
	},
	delete: async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401, { message: 'Not logged in' });
		}

		const formData = await event.request.formData();
		const id = formData.get('id');
		const parsed = typeof id === 'string' ? parseInt(id, 10) : NaN;
		if (Number.isNaN(parsed) || parsed < 1) {
			return fail(400, { message: 'Invalid item' });
		}

		await db
			.delete(watchlist)
			.where(and(eq(watchlist.id, parsed), eq(watchlist.userId, user.id)));

		return {};
	}
};
