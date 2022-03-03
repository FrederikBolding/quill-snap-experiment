const { getPublicKey, utils, sign } = require('noble-ed25519');
const stringify = require('fast-json-stable-stringify');
const WebsocketProvider = require('web3-providers-ws');
const { hexlify } = require('@ethersproject/bytes');

const stripHexPrefix = (value) => value.replace('0x', '');

const ws = new WebsocketProvider('ws://localhost:8000');

// Store this somewhere
const nonce = 0;

const handleSend = async ({ payload, retryNonce }) => {
  // Clean this up
  return new Promise(async (resolve, reject) => {
    const id = nonce;
    const privateKey = stripHexPrefix(hexlify(utils.randomPrivateKey()));
    const publicKey = await getPublicKey(privateKey);
    // Store this somewhere
    const keyPair = { publicKey, privateKey };

    //store.dispatch(incrementNonce());

    // Use fast-json-stable-stringify as it is deterministic
    const encoded = Buffer.from(stringify({ ...payload, id }), 'utf-8');
    const hash = stripHexPrefix(hexlify(await utils.sha512(encoded)));
    const signature = await sign(hash, keyPair.privateKey);
    const newPayload = {
      ...payload,
      id,
      signature,
      publicKey: keyPair.publicKey,
    };

    const errorHandlingCallback = (error, result) => {
      if (
        !retryNonce &&
        result?.error &&
        result?.error?.data?.expectedNonce !== undefined
      ) {
        const expectedNonce = result?.error?.data?.expectedNonce;
        // Correct request nonce and try again
        //store.dispatch(setNonce(expectedNonce));
        // Store this somewhere
        nonce = expectedNonce;
        return handleSend({ payload, retryNonce: true });
      }
      if (error) {
        return reject(error);
      }
      return resolve(result);
    };

    ws.send(newPayload, errorHandlingCallback);
  });
};

wallet.registerRpcMessageHandler(async (originString, requestObject) => {
  switch (requestObject.method) {
    case 'hello':
      // example tx
      return handleSend({
        payload: {
          jsonrpc: '2.0',
          method: 'eth_signTransaction',
          params: [
            {
              chainId: 3,
              data: '0x',
              from: '0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf',
              gas: '0x6270',
              maxFeePerGas: '0xb2d05e00',
              maxPriorityFeePerGas: '0xb2d05e00',
              nonce: '0xb',
              to: '0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf',
              type: 2,
              value: '0x38d7ea4c68000',
            },
          ],
        },
      });
    /**return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: `Hello, ${originString}!`,
            description:
              'This custom confirmation is just for display purposes.',
            textAreaContent:
              'But you can edit the snap source code to make it do something, if you want to!',
          },
        ],
      });**/
    default:
      throw new Error('Method not found.');
  }
});
