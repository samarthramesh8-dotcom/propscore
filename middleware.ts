// Next.js requires middleware to live in middleware.ts with a named export
// "middleware". All auth logic lives in proxy.ts — re-export it from here.
export { proxy as middleware, config } from "./proxy";
