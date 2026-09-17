# git-whproxy

HTTP proxy that forwards webhooks from GitHub, Forgejo, Gitea, and Gogs to a target, with an optional filter on the branch or tag name. It preserves the original request body and passes incoming headers to `fetch`.

## Requirements

- Node.js **24.21.0 LTS**, specified in `.node-version`.
- pnpm **12.4.2**, specified in `package.json`.
- Docker with Compose for the development listener or for running the proxy in a container.

## Local setup

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

The proxy listens on `http://localhost:3000`. To restart it automatically when source files change:

```sh
pnpm run start:watch
```

`pnpm run start:debug` also enables the debugger on port `9229`.

| Variable    | Default | Description                  |
| ----------- | ------- | ---------------------------- |
| `PORT`      | `3000`  | Proxy HTTP port              |
| `LOG_LEVEL` | `info`  | Logging level for `loglevel` |

Set variables in the process environment; the server does not load `.env` files automatically.

## Development with a local target

Start the echo listener in one terminal:

```sh
docker compose up -d
docker compose logs -f listener
```

In another terminal, start the proxy with `pnpm run start:watch`. Compose runs **only the listener**, accessible from your computer at `http://localhost:9120`. Its logs show the received headers and body.

[api.http](api.http) includes separate requests for the four Git services, plus examples of a filter mismatch and a target error. Open it with a client that supports `.http` files. The `proxyUrl` and `targetUrl` variables are already set for this local setup. Payloads are simplified examples without signatures.

An equivalent request using curl:

```sh
curl -X POST \
  'http://localhost:3000/wh?refMatch=v*.*.*&forwardMethod=POST&forwardUrl=http%3A%2F%2Flocalhost%3A9120%2Flistener%2Fgithub' \
  -H 'Content-Type: application/json' \
  -H 'X-GitHub-Event: push' \
  --data '{"ref":"refs/tags/v1.2.3","commits":[]}'
```

Expected response: `200` with `{"success":true,"msg":"ok"}`. To simulate an upstream error, add the `X-Set-Response-Status-Code: 503` header. The listener responds with `503` and the proxy returns `500`.

To stop the listener:

```sh
docker compose down
```

## API

### `POST /wh`

Send a JSON body with `Content-Type: application/json` and the following query parameters:

| Parameter       | Usage                                        |
| --------------- | -------------------------------------------- |
| `forwardUrl`    | Target URL, reachable from the proxy process |
| `forwardMethod` | Forwarding method, usually `POST`            |
| `refMatch`      | Optional filter with `*` and `?` wildcards   |

Specify `forwardUrl` and `forwardMethod` for requests that should be forwarded. URL-encode values in the query string, especially target URLs that contain their own parameters.

The filter matches the entire **last segment** of `ref`, ignoring case. `*` matches zero or more characters and `?` matches one character. For example, `refs/tags/v1.2.3` matches `v*.*.*`; `refs/heads/feature/login` is matched as `login`. A missing reference is treated as an empty string. Without `refMatch`, filtering is disabled.

| Outcome                        | HTTP status     | Response                                                |
| ------------------------------ | --------------- | ------------------------------------------------------- |
| Filter mismatch                | `200`           | `{"success":true,"msg":"not forwarded: ref not match"}` |
| Successful forwarding          | Upstream status | `{"success":true,"msg":"ok"}`                           |
| Unsuccessful upstream response | `500`           | `{"success":false,"msg":"Error during WH forwarding"}`  |
| Forwarding exception           | `500`           | `{"error":"Exception during WH forwarding"}`            |

The proxy generates its own response rather than returning the target's body. JSON parsing errors occur before the forwarding error handler and are handled by Express.

## Tests

```sh
pnpm test
pnpm run test:cov
pnpm run test:watch
```

Jest unit tests in `test/unit` cover wildcards, filtering, preservation of the body and headers, upstream responses, and exceptions. They mock Express and `fetch`, without opening ports or sending real webhooks. Coverage reports are written to `coverage/`.

The ESM configuration is in `test/jest.config.js`. The manifest includes e2e scripts, but no e2e project is configured yet.

## Docker

Build and run the local image:

```sh
pnpm run docker:local:build
docker run --rm --name git-whproxy \
  -p 127.0.0.1:3000:3000 \
  -e LOG_LEVEL=info \
  marcuson/git-whproxy:latest-local
```

The image uses Node.js Alpine, installs only production dependencies from the pnpm lockfile, and runs the server as an unprivileged user. Inside a container, `localhost` refers to the container itself. Set `forwardUrl` to a destination reachable from its network instead of reusing the `localhost:9120` target from the examples for a proxy running on your computer.

## Current limitations

The proxy does not authenticate requests, verify signatures, restrict destination URLs, or set an application-level forwarding timeout. Use it with trusted callers and appropriate access controls. Signature verification, when required, is the target's responsibility. Destinations and forwarding parameters are not explicitly validated.

## License

MIT, as specified in `package.json`.
