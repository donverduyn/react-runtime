import { pipe, Layer, Console } from "effect";
import { createRuntimeContext } from "../../../src/utils/context";
import { Foo } from "./Foo";

export const reference = () => Foo

export const context = pipe(
  Layer.scopedDiscard(Console.log("Hello world!")),
  createRuntimeContext
);