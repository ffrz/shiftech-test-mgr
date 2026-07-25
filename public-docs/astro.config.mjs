// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://testify.apps.shiftech.my.id',
	base: '/docs/',
	integrations: [
		starlight({
			title: 'Testify Docs',
			description:
				'User guide and data model reference for Testify — simple manual test management.',
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'guide/introduction' },
						{ label: 'Signing In', slug: 'guide/signing-in' },
					],
				},
				{
					label: 'User Guide',
					items: [
						{ label: 'Projects', slug: 'guide/projects' },
						{ label: 'Test Cases', slug: 'guide/test-cases' },
						{ label: 'Test Plans', slug: 'guide/test-plans' },
						{ label: 'Test Runs & Results', slug: 'guide/test-runs' },
						{ label: 'Issues', slug: 'guide/issues' },
						{ label: 'Team & Roles', slug: 'guide/team-roles' },
					],
				},
				{
					label: 'Data Model',
					items: [
						{ label: 'Overview', slug: 'data-model/overview' },
						{ label: 'Core Entities', slug: 'data-model/entities' },
					],
				},
			],
			head: [
				{
					tag: 'meta',
					attrs: { property: 'og:site_name', content: 'Testify Docs' },
				},
			],
		}),
		sitemap(),
	],
});
