import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isDevInfoOverlayEnabled } from "./gate.ts";

describe("dev info overlay gate", () => {
  it("requires development, no Vercel, and explicit opt-in", () => {
    assert.equal(
      isDevInfoOverlayEnabled({
        NODE_ENV: "development",
        DEV_INFO_OVERLAY: "1"
      }),
      true
    );
  });

  it("blocks production, preview, and missing opt-in", () => {
    assert.equal(
      isDevInfoOverlayEnabled({
        NODE_ENV: "production",
        DEV_INFO_OVERLAY: "1"
      }),
      false
    );
    assert.equal(
      isDevInfoOverlayEnabled({
        NODE_ENV: "development",
        VERCEL: "1",
        DEV_INFO_OVERLAY: "1"
      }),
      false
    );
    assert.equal(
      isDevInfoOverlayEnabled({
        NODE_ENV: "development"
      }),
      false
    );
  });
});
