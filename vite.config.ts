import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const APPROVED_PILOT_PREVIEW_BRANCH = "feature/ccsf-phases-3-8-release-candidate";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (mode === "production" && (!supabaseUrl || !supabasePublishableKey)) {
    throw new Error(
      "Production builds require VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const explicitPilotFlag =
    env.VITE_PILOT_MODE_ENABLED || process.env.VITE_PILOT_MODE_ENABLED;
  const vercelEnvironment = env.VERCEL_ENV || process.env.VERCEL_ENV;
  const vercelBranch = env.VERCEL_GIT_COMMIT_REF || process.env.VERCEL_GIT_COMMIT_REF;
  const approvedPreviewBranch =
    vercelEnvironment === "preview" && vercelBranch === APPROVED_PILOT_PREVIEW_BRANCH;
  const pilotModeEnabled =
    explicitPilotFlag === "true" || approvedPreviewBranch ? "true" : "false";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    define: {
      "import.meta.env.VITE_PILOT_MODE_ENABLED": JSON.stringify(pilotModeEnabled),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
  };
});
