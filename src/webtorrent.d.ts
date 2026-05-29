// Stub declarations for webtorrent.
// The package ships no .d.ts and @types/webtorrent does not exist.
// vite.config.ts aliases 'webtorrent' → the pre-built browser bundle (dist/webtorrent.min.js)
// so both import paths are covered here.
declare module 'webtorrent' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebTorrent: any
  export default WebTorrent
}
declare module '*/webtorrent.min.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebTorrent: any
  export default WebTorrent
}
