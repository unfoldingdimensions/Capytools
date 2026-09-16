/**
 * The real transport for the Extract route: one GET over node:http/https
 * with request-filtering-agent as the agent (plan §7b.3 step 7 — the belt
 * to this file's braces). The agent re-resolves the host at connect time
 * and refuses private/reserved addresses on the wire, so a rebinding window
 * between our DNS check and the socket meets a second, independent gate.
 *
 * Node's global fetch cannot take an http.Agent (and Next's patched fetch
 * wraps it), so this rides the raw modules — which also means redirects
 * are physically impossible here; the guards in fetchDoc own them.
 *
 * GET only. The User-Agent is honest and constant. Bodies are never read
 * here, logged, or echoed — only handed, unbuffered, to the cap reader.
 */

import http from "node:http";
import https from "node:https";

import { useAgent } from "request-filtering-agent";

import type { HttpReply, Transport } from "./fetchDoc";

export const CAPYTONE_USER_AGENT = "CapyTone/1.0 (+https://capytools.app)";

export const nodeTransport: Transport<void> = (url, { signal, accept }) =>
  new Promise<HttpReply<void>>((resolve, reject) => {
    const send = url.protocol === "https:" ? https.request : http.request;
    const request = send(
      url,
      {
        method: "GET",
        agent: useAgent(url.href),
        signal,
        headers: {
          "User-Agent": CAPYTONE_USER_AGENT,
          Accept: accept,
          // No transfer coding: the byte cap counts real bytes, and no
          // decompression bomb can hide behind the content-length.
          "Accept-Encoding": "identity",
          Connection: "close",
        },
      },
      (response) => {
        const location = response.headers.location;
        resolve({
          status: response.statusCode ?? 0,
          contentType: typeof response.headers["content-type"] === "string"
            ? response.headers["content-type"]
            : null,
          contentEncoding: typeof response.headers["content-encoding"] === "string"
            ? response.headers["content-encoding"]
            : null,
          location: typeof location === "string" ? location : (location?.[0] ?? null),
          body: response as unknown as AsyncIterable<Uint8Array>,
          meta: undefined,
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
