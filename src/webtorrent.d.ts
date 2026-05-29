// Stub declaration for webtorrent — the package ships no .d.ts and @types/webtorrent does not exist.
// The component imports it dynamically and casts to `any`, so this just silences TS7016.
declare module 'webtorrent' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebTorrent: any
  export default WebTorrent
}
