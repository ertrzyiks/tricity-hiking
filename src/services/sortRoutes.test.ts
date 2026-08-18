import { describe, expect, it } from "vitest";
import { sortRoutes } from "./sortRoutes";

const route = (id: string, order?: number) => ({ id, data: { order } });

describe("sortRoutes", () => {
  it("sorts routes by ascending order", () => {
    const routes = [route("c", 3), route("a", 1), route("b", 2)];

    expect(sortRoutes(routes).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("places routes without an explicit order after ordered ones", () => {
    const routes = [route("no-order"), route("b", 2), route("a", 1)];

    expect(sortRoutes(routes).map((r) => r.id)).toEqual(["a", "b", "no-order"]);
  });

  it("keeps the original relative order among routes without an explicit order", () => {
    const routes = [route("first"), route("second"), route("third")];

    expect(sortRoutes(routes).map((r) => r.id)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("does not mutate the input array", () => {
    const routes = [route("b", 2), route("a", 1)];

    sortRoutes(routes);

    expect(routes.map((r) => r.id)).toEqual(["b", "a"]);
  });
});
