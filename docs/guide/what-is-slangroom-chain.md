<!--
SPDX-FileCopyrightText: 2024 Dyne.org foundation

SPDX-License-Identifier: CC-BY-NC-SA-4.0
-->

# What is Slangroom-chain?

Slangroom-chain is a library that helps you to chain the execution of different slangroom smart contracts. You can define a chain of steps, where each step is a [slangroom](dyne.org/slangroom) contract with its own set of inputs and outputs.

::: tip
Just want to try it out? Skip to the [Quickstart](/guide/getting-started.md)
:::

Slangroom-chain allows you to pass the output of one step as input to another step, thus making it possible to create complex workflows that involve multiple slangroom contracts. The library also provides additional hooks that can be used to transform the output data before passing it to the next step, or to perform additional actions before or after a step is executed.

## Contributing

If you encounter any issues or have suggestions for improvements, please don't hesitate to open an issue or submit a pull request on our GitHub repository. We appreciate any contributions from the community that help make slangroom-chain an even better tool for you.

https://github.com/dyne/slangroom-chain
