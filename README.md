<h1 align="center">
  @dyne/zencode-chain<br/><br/>
  <sub>Execute chain of zencode smart contracts</sub>
</h1>

<p align="center">
  <a href="https://dyne.org">
    <img src="https://img.shields.io/badge/%3C%2F%3E%20with%20%E2%9D%A4%20by-Dyne.org-blue.svg" alt="Dyne.org">
  </a>
</p>

<br><br>

<h4 align="center">
  <a href="#-install">💾 Install</a>
  <span> • </span>
  <a href="#-quick-start">🎮 Quick start</a>
  <span> • </span>
  <a href="#-testing">📋 Testing</a>
  <span> • </span>
  <a href="#-troubleshooting--debugging">🐛 Troubleshooting & debugging</a>
  <span> • </span>
  <a href="#-acknowledgements">😍 Acknowledgements</a>
  <span> • </span>
  <a href="#-links">🌐 Links</a>
  <span> • </span>
  <a href="#-contributing">👤 Contributing</a>
  <span> • </span>
  <a href="#-license">💼 License</a>
</h4>

Zenroom and zencode are part of the [DECODE project](https://decodeproject.eu) about data-ownership and [technological sovereignty](https://www.youtube.com/watch?v=RvBRbwBm_nQ). Our effort is that of improving people's awareness of how their data is processed by algorithms, as well facilitate the work of developers to create along [privacy by design principles](https://decodeproject.eu/publications/privacy-design-strategies-decode-architecture) using algorithms that can be deployed in any situation without any change.

<details id="toc">
 <summary><strong>🚩 Table of Contents</strong> (click to expand)</summary>

- [Install](#-install)
- [Quick start](#-quick-start)
- [Testing](#-testing)
- [Troubleshooting & debugging](#-troubleshooting--debugging)
- [Acknowledgements](#-acknowledgements)
- [Links](#-links)
- [Contributing](#-contributing)
- [License](#-license)
</details>

---

## 💾 Install

`yard add @dyne/zencode-chain`

---

## 🎮 Quick start

In many use-cases you want to chain execution of different zencode and
pass the output as keys/data to other zencodes.
This small library helps to achieve that by putting your zencode in an
array of steps.

in the following example we define two steps and the result of the first
is passed as `keys` to the second one.

```js
import { execute } from '@dyne/zencode-chain';

const newAccount = `{"username": "Alice"}`;

const steps_definition = {
  verbosity: false,
  steps: [
    {
      id: 'step1',
      zencode: `Scenario ecdh: create the keypair at user creation
Given that my name is in a 'string' named 'username'
When I create the keypair
Then print my 'keypair'`,
      data: newAccount,
    },
    {
      id: 'step2',
      zencode: `Scenario 'ecdh': Publish the public key
Given that my name is in a 'string' named 'username'
and I have my 'keypair'
Then print my 'public key' from 'keypair'`,
      data: newAccount,
      keysFromStep: 'step1',
    },
  ],
};

execute(steps).then((r) => console.log(r));
```

### Step definitions

The steps definition is an object literal defined as follows:

```typescript
type Steps = {
  readonly steps: readonly Step[]; // an array of step definitions
  readonly conf?: string; // zenroom configuration, could be overridden by each step
  readonly verbose?: boolean;
};
```

The single step definition is an object literal defined as follows:

```typescript
type Step = {
  readonly id: string;
  readonly zencode: string;
  readonly data?: string;
  readonly dataFromStep?: string;
  readonly dataTransform?:
    | ((data: string) => string)
    | ((data: string) => Promise<string>);
  readonly keys?: string;
  readonly keysFromStep?: string;
  readonly keysTransform?:
    | ((data: string) => string)
    | ((data: string) => Promise<string>);
  readonly conf?: string;
};
```

The list of the attributes are:

- **id** mandatory, a unique string to identify your step
- **zencode** mandatory, your zencode to run
- **data** optional, the data; when you want to pass it directly
- **dataFromStep** optional, the step.id to get the result as input
- **dataTransform** optional, a function that accepts a string and return a string,
  that will be executed on data just before the execution. This intended to be used
  to mangle your data with some transformation (eg. remove a key, or rename it)
- **keys** optional, the keys; when you want to pass it directly
- **keysFromStep** optional, the step.id to get the result as input
- **keysTransform** optional, a function that accepts a string and return a string,
  that will be executed on keys just before the execution. This intended to be used
  to mangle your keys with some transformation (eg. remove an attribute, or rename it)
- **conf** optional, the zenroom conf for the specific zencode_exec (eg. 'memmanager=lw')
  overrides generic one

---

## 📋 Testing

``yarn test`

**[🔝 back to top](#toc)**

---

## 🐛 Troubleshooting & debugging

No known issue by now

**[🔝 back to top](#toc)**

---

## 😍 Acknowledgements

[![software by Dyne.org](https://files.dyne.org/software_by_dyne.png)](http://www.dyne.org)

Copyleft (ɔ) 2021 by [Dyne.org](https://www.dyne.org) foundation, Amsterdam

Designed, written and maintained by Puria Nafisi Azizi.

Special thanks to Mr. W. White for his special contributions.

**[🔝 back to top](#toc)**

---

## 🌐 Links

https://dev.zenroom.org/

https://dyne.org/

**[🔝 back to top](#toc)**

---

## 👤 Contributing

Please first take a look at the [Dyne.org - Contributor License Agreement](CONTRIBUTING.md) then

1.  🔀 [FORK IT](../../fork)
2.  Create your feature branch `git checkout -b feature/branch`
3.  Commit your changes `git commit -am 'Add some fooBar'`
4.  Push to the branch `git push origin feature/branch`
5.  Create a new Pull Request
6.  🙏 Thank you

**[🔝 back to top](#toc)**

---

## 💼 License

    @dyne/zencode-chain - Execute chain of zencode smart contracts
    Copyleft (ɔ) 2021 Dyne.org foundation, Amsterdam

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

**[🔝 back to top](#toc)**
