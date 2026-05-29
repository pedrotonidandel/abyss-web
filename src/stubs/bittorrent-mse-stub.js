/**
 * Browser stub for bittorrent-protocol/mse.js
 *
 * mse.js implements Message Stream Encryption (RC4) for TCP BitTorrent connections.
 * It requires Node.js native crypto bindings (RC4) which don't exist in browsers.
 * WebTorrent in browsers uses WebRTC only — MSE/TCP code never runs, so this stub is safe.
 *
 * nativeRC4 = false tells bittorrent-protocol to use the pure-JS RC4 fallback instead
 * of trying native bindings (which would throw in the browser).
 */

export const nativeRC4 = false

export class MessageStreamEncryptor {
  constructor () {}
  encrypt (buf) { return buf }
  decrypt (buf) { return buf }
}
