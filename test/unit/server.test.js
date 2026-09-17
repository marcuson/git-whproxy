import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

const app = { use: jest.fn(), post: jest.fn(), listen: jest.fn() };
const log = {
  setLevel: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

// Capture the real handler without starting a server or making HTTP requests.
jest.unstable_mockModule("express", () => ({ default: () => app }));
jest.unstable_mockModule("loglevel", () => ({ default: log }));
await import("../../src/server.js");
const [route, parser, handleWebhook] = app.post.mock.calls[0];
const [port, onStarted] = app.listen.mock.calls[0];
const logIncomingRequest = app.use.mock.calls[0][0];

describe("webhook server", () => {
  let req;
  let res;
  let fetchMock;

  beforeEach(() => {
    req = {
      query: {
        refMatch: "v*.*.*",
        forwardUrl: "http://target.test/webhook",
        forwardMethod: "POST",
      },
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-hub-signature-256": "sha256=example",
      },
      body: '{ "ref": "refs/tags/v0.12.1", "commits": [] }',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 201,
    });
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  test("registers /wh and logs server startup", () => {
    expect(route).toBe("/wh");
    expect(parser).toEqual(expect.any(Function));
    onStarted();
    expect(log.info).toHaveBeenCalledWith(`WH proxy started on port ${port}`);
  });

  test("passes the original body, headers, method and target to fetch", async () => {
    req.query.forwardMethod = "PUT";
    await handleWebhook(req, res);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(req.query.forwardUrl, {
      method: "PUT",
      headers: req.headers,
      body: req.body,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, msg: "ok" });
  });

  test("does not contact the target when the ref does not match", async () => {
    req.body = '{"ref":"refs/heads/main"}';
    await handleWebhook(req, res);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      msg: "not forwarded: ref not match",
    });
  });

  test("filters the last ref segment without case sensitivity", async () => {
    req.body = '{"ref":"refs/heads/feature/V1.2.3"}';
    await handleWebhook(req, res);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("does not require a ref when filtering is disabled", async () => {
    delete req.query.refMatch;
    req.body = "{}";
    await handleWebhook(req, res);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("treats a missing ref as an empty string when filtering", async () => {
    req.body = "{}";
    await handleWebhook(req, res);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      msg: "not forwarded: ref not match",
    });
  });

  test("returns 500 and logs the upstream body on an unsuccessful response", async () => {
    const text = jest.fn().mockResolvedValue("target unavailable");
    fetchMock.mockResolvedValue({ ok: false, status: 503, text });
    await handleWebhook(req, res);

    expect(text).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledWith(
      "Error during WH forwarding",
      "target unavailable",
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      msg: "Error during WH forwarding",
    });
  });

  test("returns 500 when fetch rejects", async () => {
    const error = new Error("connection refused");
    fetchMock.mockRejectedValue(error);
    await handleWebhook(req, res);

    expect(console.error).toHaveBeenCalledWith(
      "Exception during WH forwarding",
      error,
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Exception during WH forwarding",
    });
  });

  test("returns 500 if reading an upstream error body fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      text: jest.fn().mockRejectedValue(new Error("body interrupted")),
    });
    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Exception during WH forwarding",
    });
  });

  test("never forwards invalid JSON; parsing currently rejects before the try", async () => {
    req.body = "invalid JSON";
    await expect(handleWebhook(req, res)).rejects.toThrow(SyntaxError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("logs incoming requests and continues the middleware chain", () => {
    const next = jest.fn();
    req.method = "POST";
    req.originalUrl = "/wh";
    logIncomingRequest(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith("Incoming WH: /wh");
    expect(log.debug).toHaveBeenCalledWith(
      expect.stringContaining('"method": "POST"'),
    );
  });
});
