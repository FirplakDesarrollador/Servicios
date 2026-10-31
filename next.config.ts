import path from "path";
import type { NextConfig } from "next";

// Fija la raiz del proyecto a esta carpeta para que Next.js no tome
// un package-lock.json de una carpeta superior (p. ej. al trabajar en un worktree).
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
