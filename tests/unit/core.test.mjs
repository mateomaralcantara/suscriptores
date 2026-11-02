import test from "node:test";
import assert from "node:assert/strict";

function price(base, margin, quantity) { return Number((base * margin * quantity / 100).toFixed(2)); }
function validQuantity(q, min, max) { return q >= min && q <= max; }

test("unit pricing case 1", () => assert.equal(price(2, 1.4, 100), Number(((2)*1.4).toFixed(2))));
test("unit quantity case 2", () => assert.equal(validQuantity(20, 10, 10000), true));
test("unit pricing case 3", () => assert.equal(price(4, 1.4, 100), Number(((4)*1.4).toFixed(2))));
test("unit quantity case 4", () => assert.equal(validQuantity(40, 10, 10000), true));
test("unit pricing case 5", () => assert.equal(price(6, 1.4, 100), Number(((6)*1.4).toFixed(2))));
test("unit quantity case 6", () => assert.equal(validQuantity(60, 10, 10000), true));
test("unit pricing case 7", () => assert.equal(price(8, 1.4, 100), Number(((8)*1.4).toFixed(2))));
test("unit quantity case 8", () => assert.equal(validQuantity(80, 10, 10000), true));
test("unit pricing case 9", () => assert.equal(price(10, 1.4, 100), Number(((10)*1.4).toFixed(2))));
test("unit quantity case 10", () => assert.equal(validQuantity(100, 10, 10000), true));
test("unit pricing case 11", () => assert.equal(price(12, 1.4, 100), Number(((12)*1.4).toFixed(2))));
test("unit quantity case 12", () => assert.equal(validQuantity(120, 10, 10000), true));
test("unit pricing case 13", () => assert.equal(price(14, 1.4, 100), Number(((14)*1.4).toFixed(2))));
test("unit quantity case 14", () => assert.equal(validQuantity(140, 10, 10000), true));
test("unit pricing case 15", () => assert.equal(price(16, 1.4, 100), Number(((16)*1.4).toFixed(2))));
test("unit quantity case 16", () => assert.equal(validQuantity(160, 10, 10000), true));
test("unit pricing case 17", () => assert.equal(price(18, 1.4, 100), Number(((18)*1.4).toFixed(2))));
test("unit quantity case 18", () => assert.equal(validQuantity(180, 10, 10000), true));
test("unit pricing case 19", () => assert.equal(price(20, 1.4, 100), Number(((20)*1.4).toFixed(2))));
test("unit quantity case 20", () => assert.equal(validQuantity(200, 10, 10000), true));
test("unit pricing case 21", () => assert.equal(price(22, 1.4, 100), Number(((22)*1.4).toFixed(2))));
test("unit quantity case 22", () => assert.equal(validQuantity(220, 10, 10000), true));
test("unit pricing case 23", () => assert.equal(price(24, 1.4, 100), Number(((24)*1.4).toFixed(2))));
test("unit quantity case 24", () => assert.equal(validQuantity(240, 10, 10000), true));
test("unit pricing case 25", () => assert.equal(price(26, 1.4, 100), Number(((26)*1.4).toFixed(2))));
test("unit quantity case 26", () => assert.equal(validQuantity(260, 10, 10000), true));
test("unit pricing case 27", () => assert.equal(price(28, 1.4, 100), Number(((28)*1.4).toFixed(2))));
test("unit quantity case 28", () => assert.equal(validQuantity(280, 10, 10000), true));
test("unit pricing case 29", () => assert.equal(price(30, 1.4, 100), Number(((30)*1.4).toFixed(2))));
test("unit quantity case 30", () => assert.equal(validQuantity(300, 10, 10000), true));