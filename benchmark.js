const {execute} = require('./build/main/index')
const bench = require('nanobench')

const signPetition = async () => {
  const account = `{"username": "Alice"}`
  const participants = `{ "participants": [ "jaromil@dyne.org", "puria@dyne.org", "andrea@dyne.org" ] }`

  const participant_email = `{"email": "bob@wonder.land", "petition_uid": "More privacy for all!"}`
  const steps = {
    verbose: false,
    conf: 'memmanager=lw',
    steps: [
      {
        id: 'issuer_keypair',
        zencode: `Scenario credential: publish verifier
            Given that I am known as 'Decidiamo'
            When I create the issuer keypair
            Then print my 'issuer keypair'`,
      },
      {
        id: 'keypair',
        zencode: `Scenario ecdh: create the keypair at user creation
            Given that my name is in a 'string' named 'username'
            When I create the keypair
            Then print my 'keypair'`,
        data: account,
      },
      {
        id: 'pubkey',
        zencode: `Scenario 'ecdh': Publish the public key
            Given that my name is in a 'string' named 'username'
            and I have my 'keypair'
            Then print my 'public key' from 'keypair'`,
        data: account,
        keysFromStep: 'keypair',
      },
      {
        id: 'petition_request',
        zencode: `Scenario credential: create the petition credentials
Scenario petition: create the petition
Scenario ecdh: sign the petition

# state my identity
Given that I am known as 'Alice'
and I have my 'keypair'
and I have a 'string array' named 'participants'

# create the petition and its keypair
When I create the credential keypair
and I create the petition 'More privacy for all!'

# sign the hash
# When I create the hash of 'petition'
When I create the signature of 'petition'
and I insert 'signature' in 'petition'

When I create the signature of 'participants'
and I rename the 'signature' to 'participants.signature'

Then print my 'credential keypair'
and print the 'petition'
and print the 'participants'
and print the 'participants.signature'
and print the 'public key' inside 'keypair'
        `,
        keysFromStep: 'keypair',
        data: participants,
      },
      {
        id: 'new_petition',
        dataFromStep: 'petition_request',
        dataTransform: (data) => {
          const o = JSON.parse(data);
          delete o.Alice;
          return JSON.stringify(o);
        },
        keysFromStep: 'pubkey',
        zencode: `Scenario ecdh
            Scenario petition

            Given that I have a 'public key' from 'Alice'
            and I have a 'petition'
            and I have a 'string array' named 'participants'
            and I have a 'signature' named 'participants.signature'

            When I verify the 'petition' is signed by 'Alice'
            and I verify the new petition to be empty

            When I verify the 'participants' has a signature in 'participants.signature' by 'Alice'
            and I verify 'participants' contains a list of emails

            Then print 'petition'
            and print 'participants'
            and print the 'uid' as 'string' inside 'petition'`,
      },
      {
        id: 'petition',
        dataFromStep: 'new_petition',
        keysFromStep: 'issuer_keypair',
        zencode: `Scenario credential
          Scenario petition
          Given I am 'Decidiamo'
          and I have my 'issuer keypair'
          and I have a 'petition'
          When I create the copy of 'verifier' from dictionary 'issuer keypair'
          and I rename the 'copy' to 'verifier'
          and I insert 'verifier' in 'petition'
          Then print the 'petition'`,
      },
      {
        id: 'signature_credential',
        keysFromStep: 'issuer_keypair',
        data: participant_email,
        zencode: `Scenario credential
            Given that I am known as 'Decidiamo'
            and I have my 'issuer keypair'
            and I have a 'string' named 'email'
            and I have a 'string' named 'petition_uid'
            When I append 'email' to 'petition_uid'
            and I create the hash of 'petition_uid'
            and I create the credential keypair with secret key 'hash'
            and I create the credential request
            and I create the credential signature
            and I create the credentials
            Then print the 'credentials'
            and print the 'credential keypair'
            and print the 'verifier'`,
      },
      {
        id: 'sign_proof',
        dataFromStep: 'signature_credential',
        zencode: `Scenario credential
            Scenario petition: sign petition
            Given I am 'Bob'
            and I have a 'credential keypair'
            and I have a 'credentials'
            and I have a 'verifier'
            When I aggregate the verifiers
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
            When the petition signature is not a duplicate
            and the petition signature is just one more
            and I add the signature to the petition
            Then print the 'petition'`,
      },
    ],
  };

  (await execute(steps));
};

bench('petition flow 200.000 times', function (b) {
  b.start()

  for (var i = 0; i < 100; i++) {
    (async () => { await signPetition() })()
  }

  b.end()
})
