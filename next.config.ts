import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Both DB backends (see src/lib/db/client.ts) need to run as real Node
  // modules rather than get bundled by Next's dev/build pipeline:
  // `@electric-sql/pglite` resolves its WASM/data assets relative to its own
  // package location at runtime (breaks under Turbopack/webpack bundling —
  // manifests as "path argument must be of type string ... Received an
  // instance of URL"), and `pg` has optional native/lazy-loaded submodules
  // that don't need bundling on the server either.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
