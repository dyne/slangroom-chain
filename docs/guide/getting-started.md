<!--
SPDX-FileCopyrightText: 2024 Dyne.org foundation

SPDX-License-Identifier: CC-BY-NC-SA-4.0
-->

# Getting Started

## Setup

Create a new directory and initialize the project with the command

::: code-group
```sh [npm]
npm init
```
```sh [pnpm]
pnpm init
```
:::

## Installation

Install the slangroom-chain library

::: code-group
```sh [npm]
npm install @dyne/slangroom-chain
```
```sh [pnpm]
pnpm add @dyne/slangroom-chain
```
:::

## Simple example

Wrote a simple example in your `index.mjs` file:

```js [index.mjs]
import { execute } from '@dyne/slangroom-chain';

const newAccount = `{"username": "Alice"}`;

const steps_definition = `
  verbose: false
  steps: 
    - id: 'step1'
      zencode: |
        Scenario ecdh: create the keyring at user creation
        Given that my name is in a 'string' named 'username'
        When I create the ecdh key
        Then print my 'keyring'
      data: ${newAccount}
    - id: 'step2'
      zencode: |
        Scenario 'ecdh': Create and publish public key
        Given that my name is in a 'string' named 'username'
        and I have my 'keyring'
        When I create the ecdh public key
        Then print my 'ecdh public key'
      data: ${newAccount}
      keysFromStep: 'step1'`;

execute(steps_definition).then((r) => console.log(JSON.parse(r)));
```

## Run the example

Run:

```bash
node index.mjs
```

and the output will be:

```json
{
  "Alice": {
    "ecdh_public_key": "BFvytil19FNtQF2s2Rk1MM3CbheE/C8OKon9N8r+W/i9+RD0KOQDTtNOz4h7VkacULra+cbH+p34zezzCtjQSbA="
  }
}
```
