import test from "node:test";
import assert from "node:assert/strict";
import { orderPlatforms, orderServices } from "../../lib/order-services.ts";
import { validateOrder } from "../../lib/order-rules.ts";

test("catalog service ids are unique", () => {
  const ids = orderServices.map((service) => service.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every catalog service has a coherent configuration", () => {
  for (const service of orderServices) {
    assert.ok(service.rate > 0, `${service.id} rate`);
    assert.ok(Number.isInteger(service.min) && service.min > 0, `${service.id} min`);
    assert.ok(Number.isInteger(service.max) && service.max >= service.min, `${service.id} max`);
    assert.ok(service.refillDays >= 0, `${service.id} refillDays`);
    assert.ok(orderPlatforms.includes(service.platform), `${service.id} platform ${service.platform}`);
    assert.ok(service.name && service.description, `${service.id} text`);
  }
});

test("platform tabs start with All and have no duplicates", () => {
  assert.equal(orderPlatforms[0], "All");
  assert.equal(new Set(orderPlatforms).size, orderPlatforms.length);
});

test("every catalog service accepts its own min and max quantity", () => {
  for (const service of orderServices) {
    for (const quantity of [service.min, service.max]) {
      const result = validateOrder({ serviceId: service.id, link: "https://example.com/x", quantity }, orderServices);
      assert.equal(result.ok, true, `${service.id} quantity=${quantity}`);
      assert.ok(result.order.charge > 0);
    }
  }
});
