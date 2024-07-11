<!--
SPDX-FileCopyrightText: 2024 Dyne.org foundation

SPDX-License-Identifier: CC-BY-NC-SA-4.0
-->

# Step definition

## Quick overwiew of all properties

The steps definition is written following the [yaml format](https://yaml.org/spec/1.2.2/). All the possible properties are:

```yaml
verbose: boolean
config: string
steps:
  - id: string
    data: string | obejct
    dataFromStep: string
    dataFromFile: string
    keys: string | obejct
    keysFromStep: string
    keysFromFile: string
    conf: string
    zencode: string
    zencodeFromFile: string
    dataTransform: string
    keysTransform: string
    onBefore:
      run: string
      jsFunction: string
    onAfter:
      run: string
      jsFunction: string
```

## Properties description

### verbose

verbose is optional, its value must be a boolean, by default it is false. If set to true will print to the console the data in input, their trasnfromation and the output of each step.

### config

config is optional, its value must be a string containing the zenroom configuration that will be used by all the slangroom contracts (eg. 'rngseed=hex:...'). It can be overriden by the conf property of each step.

### steps

steps is mandatory property, its value must be an array of step.

### step.id

id is mandatory property, it is a unique string to identify the step among all the others.

### step.zencode

zencode must be present if zencodeFromFile is not, its value must be a string containing the slangroom contract to execute.

### step.zencodeFromFile

zencodeFromFile must be present if zencode is not, this string contains the path to the slangroom contract to execute.

### step.data

data is optional, it can be a string (*i.e.* a stringified json) or an object containing the data to be passed directly to the slangroom contract.

### step.dataFromStep

dataFromStep is optional, its value must be a string equal to one of the previous step id. As a result the output of the previous step will be passed to the slangroom contract in the data channel.

### step.dataFromFile

dataFromFile is optional, its value must be a string containing the path to the data file.

### step.dataTransform

dataTransform is optional, its value must be a string containing the body of a (sync or async) js function that has `data` as input string and return a string, this function will be executed on data just before the execution. This intended to be used to mangle your data with some transformation (eg. remove a key, or rename it).

### step.keys

keys is optional, it can be a string (*i.e.* a stringified json) or an object containing the keys to be passed directly to the slangroom contract.

### step.keysFromStep

keysFromStep is optional, its value must be a string equal to one of the previous step id. As a result the output of the previous step will be passed to the slangroom contract in the keys channel.

### step.keysFromFile

keysFromFile is optional, its value must be a string containing the path to the keys file.

### step.keysTransform

keyTransform is optional, its value must be a string containing the body of a (sync or async) js function that has `keys` as input string and return a string, this function will be executed on keys just before the execution. This intended to be used to mangle your keys with some transformation (eg. remove a key, or rename it).

### step.conf

conf is optional, its value must be a string containing the zenroom configuration for the specific slangroom contract (eg. 'rngseed=hex:...'), it overrides the generic one.

### step.onBefore

onBefore is optional, this can contains a jsFunction or a run attribute where:

* jsFunction is optional, its value must be a string containing the body of a (sync or async) js function that has `zencode, data, keys, conf` as input strings and return a nothing
* run is optional, its value must be a string containing a shell command to execute

This will be executed before the contract execution, it can not modify anything, but can be used to perform external operations (eg. do a call to an external API, send a email, etc).

### step.onAfter

onAfter is optional, this can contains jsFunction or run attributes where:

* jsFunction is optional, its value must be a string containing the body of a (sync or async) js function that has `result, zencode, data, keys, conf` as input strings and return a nothing
* run is optional, its value must be a string containing a shell command to execute

This will be executed after the contract execution, it can not modify anything, but can be used to perform external operations (eg. do a call to an external API, send a email, etc).
