/*
SPDX-FileCopyrightText: 2024 Dyne.org foundation

SPDX-License-Identifier: AGPL-3.0-or-later
*/
import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Slangroom-chain',
  description: '⛓️  Execute chain of slangroom smart contracts  ',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/what-is-slangroom-chain' },
      { text: 'Examples', link: '/examples/' },
    ],

    sidebar: {
      '/guide': {
        text: 'Introduction',
        items: [
          {
            text: 'What is Slangroom-chain?',
            link: '/guide/what-is-slangroom-chain',
          },
          { text: 'Getting Started', link: '/guide/getting-started.md' },
        ],
      },

      '/examples': {
        text: 'Examples',
        items: [{ text: 'Cooming soon', link: '/examples' }],
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
    ],
  },
});
