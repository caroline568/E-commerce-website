import test from "node:test";
import assert from "node:assert/strict";
import { mediaPreviewUrl, safePublicUrl } from "./media.js";

test("public media accepts HTTPS and same-site paths", () => {
  assert.equal(
    safePublicUrl("https://cdn.example.com/object.jpg"),
    "https://cdn.example.com/object.jpg",
  );
  assert.equal(safePublicUrl("/media/object.jpg"), "/media/object.jpg");
});

test("public media rejects script and protocol-relative URLs", () => {
  assert.equal(safePublicUrl("javascript:alert(1)"), null);
  assert.equal(safePublicUrl("//example.com/object.jpg"), null);
  assert.equal(safePublicUrl("/\\\\example.com/object.jpg"), null);
  assert.equal(
    mediaPreviewUrl({ mediaType: "video", posterUrl: "javascript:alert(1)" }),
    null,
  );
});
