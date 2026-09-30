/**
 * Host half of the conversation-width bundle.
 *
 * The whole feature lives in the Client half (`./client.js`, declared by
 * `dsh.client` in package.json): it owns one persisted width preference and
 * publishes it as the Harness' own `--dsh-chat-content-width` axis, plus one
 * composer-dock entry that edits it.
 *
 * This Host row exists so the bundle has a mounted Loader entry whose Client
 * half the Web shell loads; it registers no Service, Event or Tool, so no
 * profile state depends on it.
 *
 * @returns {void}
 */
export function apply() {}
