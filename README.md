# CLI email checker for gmail/gsuite

## Not yet suitable for `npm`

Although the package is available via `npm i -g @in1t/inbox`, however, this will not allow you to include your creds.

@TODO: Read creds. from external JSON file.

## Features
- Shows your inbox threads.
- Shows messages inside each thread.
- Shows message date and labels & part of the body.

## Getting started:
1. Follow the steps in https://developers.google.com/gmail/api/quickstart/nodejs
2. Download the creds file in the same proj repo, and name it `client_secret.json`
3. `node index.js`
4. Or link the module globally locally and use it via `inbox`.

## Usage:
- List last 25 messages `node index.js` or `inbox`.
- List last 10 messages `node index.js 10` or `inbox 10`.
- Search for the last 10 messages that has the word **mango** `node index.js mango 10` or `inbox mango 10` order doesn't matter `mango 10` or `10 mango` are the same.