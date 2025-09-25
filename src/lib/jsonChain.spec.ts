// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import test from 'ava';
import fs from 'fs/promises';

import { execute } from './chain.js';
import { readFromFile } from './utils.js';

declare global {
  // eslint-disable-next-line no-var
  var variable: string;
}
global.variable = 'Hello';

test('should execute work [json]', async (t) => {
  const account = JSON.stringify({ username: 'Alice' });
  const participants = JSON.stringify({
    participants: ['jaromil@dyne.org', 'puria@dyne.org', 'andrea@dyne.org'],
  });
  const participant_email = JSON.stringify({
    email: 'bob@wonder.land',
    petition_uid: 'More privacy for all!',
  });
  const steps = {
    steps: [
      {
        id: 'issuer_keyring',
        zencode: `Scenario credential: publish verifier
            Given that I am known as 'Decidiamo'
            When I create the issuer key
            and I create the issuer public key
            Then print my 'issuer_public_key'
            Then print my 'keyring'`,
      },
      {
        id: 'keyring',
        zencode: `Scenario ecdh: create the key at user creation
            Given that my name is in a 'string' named 'username'
            When I create the ecdh key
            Then print my 'keyring'`,
        data: account,
      },
      {
        id: 'pubkey',
        zencode: `Scenario 'ecdh': Publish the public key
            Given that my name is in a 'string' named 'username'
            and I have my 'keyring'
            When I create the ecdh public key
            Then print my 'ecdh_public_key'`,
        data: account,
        keysFromStep: 'keyring',
      },
      {
        id: 'petition_request',
        zencode: `Scenario credential: create the petition credentials
Scenario petition: create the petition
Scenario ecdh: sign the petition
# state my identity
Given that I am known as 'Alice'
and I have my 'keyring'
and I have a 'string array' named 'participants'
# create the petition and its keypair
When I create the credential key
and I create the petition 'More privacy for all!'
# sign the hash
# When I create the hash of 'petition'
When I create the ecdh signature of 'petition'
and I rename 'ecdh_signature' to 'petition.signature'
When I create the ecdh signature of 'participants'
and I rename the 'ecdh signature' to 'participants.signature'
Then print my 'keyring'
and print the 'petition'
and print the 'petition.signature'
and print the 'participants'
and print the 'participants.signature'
        `,
        keysFromStep: 'keyring',
        data: participants,
      },
      {
        id: 'new_petition',
        dataFromStep: 'petition_request',
        dataTransform: (data: string) => {
          const o = JSON.parse(data);
          delete o.Alice;
          return JSON.stringify(o);
        },
        keysFromStep: 'pubkey',
        zencode: `Scenario ecdh
            Scenario petition
            Given that I have a 'ecdh public key' from 'Alice'
            and I have a 'petition'
            and I have a 'ecdh signature' named 'petition.signature'
            and I have a 'string array' named 'participants'
            and I have a 'ecdh signature' named 'participants.signature'
            When I verify the 'petition' has a ecdh signature in 'petition.signature' by 'Alice'
            and I verify the new petition to be empty
            When I verify the 'participants' has a ecdh signature in 'participants.signature' by 'Alice'
            and I verify 'participants' contains a list of emails
            When I pickup from path 'petition.uid'
            Then print 'petition'
            and print 'participants'
            and print the 'uid' as 'string'`,
      },
      {
        id: 'petition',
        dataFromStep: 'new_petition',
        keysFromStep: 'issuer_keyring',
        zencode: `Scenario credential
          Scenario petition
          Given I am 'Decidiamo'
          and I have my 'keyring'
          and I have a 'petition'
          When I create the issuer public key
          Then print the 'issuer public key'
          Then print the 'petition'`,
      },
      {
        id: 'signature_credential',
        keysFromStep: 'issuer_keyring',
        data: participant_email,
        zencode: `Scenario credential
            Given that I am known as 'Decidiamo'
            and I have my 'keyring'
            and I have a 'string' named 'email'
            and I have a 'string' named 'petition_uid'
            When I create the issuer public key
            When I append 'email' to 'petition_uid'
            and I create the hash of 'petition_uid'
            and I create the credential key with secret key 'hash'
            and I create the credential request
            and I create the credential signature
            and I create the credentials
            Then print the 'credentials'
            and print the 'keyring'
            and print the 'verifier'`,
      },
      {
        id: 'sign_proof',
        dataFromStep: 'signature_credential',
        zencode: `Scenario credential
            Scenario petition: sign petition
            Given I am 'Bob'
            and I have a 'keyring'
            and I have a 'credentials'
            and I have a 'base64 dictionary' named 'verifier'
            When I create the issuer public key
            When I aggregate the verifiers in 'verifier'
            and I create the petition signature 'More privacy for all!'
            Then print the 'petition signature'`,
      },
      {
        id: 'sign_petition',
        dataFromStep: 'petition',
        keysFromStep: 'sign_proof',
        zencode: `Scenario credential
            Scenario petition: aggregate signature
            Given that I am 'Decidiamo'
            and I have a 'petition signature'
            and I have a 'petition'
            When I verify the petition signature is not a duplicate
            and I verify the petition signature is just one more
            and I add the signature to the petition
            Then print the 'petition'`,
      },
    ],
  };

  const result = JSON.parse(await execute(steps));
  t.is(result.petition.list.length, 1);
});

test.after('specific conf step should override the generic one', async (t) => {
  const logs: string[] = [];
  console.log = (x) => {
    logs.push(x);
  };
  const steps = {
    conf: 'rngseed=hex:74eeeab870a394175fae808dd5dd3b047f3ee2d6a8d01e14bff94271565625e98a63babe8dd6cbea6fedf3e19de4bc80314b861599522e44409fdd20f7cd6cfc',
    steps: [
      {
        id: 'some',
        conf: 'rngseed=hex:11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
        zencode: `Given that I have a 'string' named 'hello'
                Then print all data as 'string'`,
        data: JSON.stringify({ hello: 'world' }),
      },
    ],
    verbose: true,
  };
  await execute(steps);
  t.true(
    logs
      .join()
      .includes(
        'CONF: rngseed=hex:11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
      ),
  );
});

test('keyTransform should work', async (t) => {
  const steps = {
    steps: [
      {
        id: 'some',
        conf: 'debug=0',
        zencode: `Given that I have a 'string' named 'hello'
                    Then print all data as 'string'`,
        keys: JSON.stringify({ hello: 'world' }),
        keysTransform: (k: string) => {
          return JSON.stringify(JSON.parse(k));
        },
      },
    ],
  };
  const result = await execute(steps);
  t.deepEqual(JSON.parse(result), { hello: 'world' });
});

test('callbacks should work', async (t) => {
  let before = false;
  let after = false;
  let afterResult = '';

  const steps = {
    steps: [
      {
        id: 'some',
        conf: 'debug=0',
        zencode: `Given that I have a 'string' named 'hello'
                    Then print all data as 'string'`,
        keys: JSON.stringify({ hello: 'world' }),
        onBefore: () => {
          before = true;
        },
        onAfter: (result: string) => {
          after = true;
          afterResult = result;
        },
        keysTransform: (k: string) => {
          return JSON.stringify(JSON.parse(k));
        },
      },
    ],
  };
  const result = await execute(steps);
  t.true(before);
  t.true(after);
  t.deepEqual(JSON.parse(afterResult), { hello: 'world' });
  t.deepEqual(JSON.parse(result), { hello: 'world' });
});

test('read from file', async (t) => {
  process.env['FILES_DIR'] = '.';
  const steps = {
    steps: [
      {
        id: 'from file',
        zencodeFromFile: 'test_contracts/hello.zen',
        dataFromFile: 'test_contracts/hello.data.json',
        keysFromFile: 'test_contracts/hello.keys.json',
      },
    ],
  };
  const result = await execute(steps);
  t.deepEqual(JSON.parse(result), { hello: 'world', bonjour: 'monde' });
});

test('read input data', async (t) => {
  const steps = {
    steps: [
      {
        id: 'from input data',
        zencodeFromFile: 'test_contracts/hello.zen',
        keysFromFile: 'test_contracts/hello.keys.json',
      },
    ],
  };
  const result = await execute(steps, '{"hello": "world"}');
  t.deepEqual(JSON.parse(result), { hello: 'world', bonjour: 'monde' });
});

test('onBefore create a file and delete it onAfter', async (t) => {
  process.env['FILES_DIR'] = '.';
  const steps = {
    steps: [
      {
        id: 'create and delete new_file',
        onBefore: {
          run: 'touch new_file_json.test',
        },
        zencode:
          "Rule unknown ignore\nGiven I send path 'file_path' and verify file exists\nGiven I have a 'string' named 'file_path'\nThen print the 'file_path'\n",
        keys: '{"file_path": "new_file_json.test"}',
        onAfter: {
          run: 'rm new_file_json.test',
        },
      },
      {
        id: 'check new_file does not exist',
        dataFromStep: 'create and delete new_file',
        zencode:
          "Rule unknown ignore\nGiven I send path 'file_path' and verify file does not exist\nGiven I have a 'string' named 'file_path'\nThen print the string 'everything works'\n",
      },
    ],
  };
  const result = await execute(steps);
  t.deepEqual(JSON.parse(result), {
    output: ['everything_works'],
  });
});

test('precondition', async (t) => {
  const steps = {
    steps: [
      {
        id: 'meet js precondition',
        precondition: {
          jsFunction: () => {
            if (variable !== 'Hello') return false;
            return true;
          },
        },
        zencode:
          "Given nothing\nWhen I create the 'string array' named 'res'\nWhen I set 'str' to 'meet js precondition' as 'string'\nWhen I move 'str' in 'res'\nThen print the 'res'\n",
      },
      {
        id: 'meet zencode precondition',
        precondition: {
          zencode:
            "Given I have a 'string array' named 'res'\n\nWhen I create copy of element '1' from array 'res'\nWhen I set 'check' to 'meet js precondition' as 'string'\nWhen I verify 'copy' is equal to 'check'\n\nThen print the 'res'\n",
          dataFromStep: 'meet js precondition',
        },
        zencode:
          "Given I have a 'string array' named 'res'\nWhen I set 'str' to 'meet zen precondition' as 'string'\nWhen I move 'str' in 'res'\nThen print the 'res'\n",
        dataFromStep: 'meet js precondition',
      },
      {
        id: 'do not meet zencode precondition',
        precondition: {
          zencodeFromFile: 'test_contracts/precondition.zen',
        },
        zencode:
          "Given I have a 'string array' named 'res'\nWhen I set 'str' to 'meet a false zen precondition' as 'string'\nWhen I move 'str' in 'res'\nThen print the 'res'\n",
        dataFromStep: 'meet zencode precondition',
      },
    ],
  };
  const result = await execute(steps);
  t.deepEqual(JSON.parse(result), {
    res: ['meet_js_precondition', 'meet_zen_precondition'],
  });
});

// failing tests

test('check for variables onBefore and onAfter, pass onBefore and fails onAfter', async (t) => {
  const steps = {
    steps: [
      {
        id: 'create and delete new_file',
        onBefore: {
          jsFunction: () => {
            if (variable !== 'Hello') {
              throw new Error('variable is not Hello: ' + variable);
            }
          },
        },
        zencode:
          "Given nothing\nWhen I set 'res' to 'cat' as 'string'\nThen print the 'res'\n",
        onAfter: {
          jsFunction: (result: string) => {
            const r = variable + '_' + JSON.parse(result).res;
            if (r !== 'Hello_world') {
              throw new Error('result is not Hello_world: ' + r);
            }
          },
        },
      },
    ],
  };
  const fn = execute(steps);
  const err = await t.throwsAsync(fn);
  t.is(err?.message, 'result is not Hello_world: Hello_cat');
});

test('onError.jsFunction', async (t) => {
  const steps = {
    steps: [
      {
        id: 'step that fails',
        zencode: "Given nothing\nWhen I copy 'a' to 'b'\nThen print data",
        onError: {
          jsFunction: (error: string) => {
            throw new Error('Error from onError: ' + error);
          },
        },
      },
    ],
  };
  const fn = execute(steps);
  const err = await t.throwsAsync(fn);
  t.true(
    err?.message.startsWith('Error from onError: [ "ZENROOM JSON LOG START",'),
    err.message,
  );
});

test('onError.zencode', async (t) => {
  process.env['FILES_DIR'] = '.';
  const steps ={
    steps: [
      {
        id: "step that produce out path",
        zencode: "Given nothing\nWhen I set 'path' to 'error_json.out' as 'string'\nThen print the 'path'\n"
      },
      {
        id: "step that fails",
        zencode: "Given nothing\nWhen I copy 'a' to 'b'\nThen print data\n",
        onError: {
          zencode: "Prepare: store in file with path 'path', content 'slangroomChainError'\nGiven I have a 'string' named 'slangroomChainError'\nThen print the data\n",
          keysFromStep: "step that produce out path"
        }
      }
    ]
  };
  const fn = execute(steps);
  const err = await t.throwsAsync(fn);
  t.true(
    err?.message.startsWith('step that fails failed with error: '),
    err.message,
  );
  const errFile = await readFromFile('error_json.out');
  t.true(errFile.startsWith('[ "ZENROOM JSON LOG START",'));
  await fs.unlink('error_json.out');
});
