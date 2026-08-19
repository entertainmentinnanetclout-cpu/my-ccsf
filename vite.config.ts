import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const APPROVED_PILOT_PREVIEW_BRANCHES = new Set(["feature/ccsf-phases-3-8-release-candidate", "agent/safety-quest-game"]);
const APPROVED_PILOT_PRODUCTION_BRANCH = "main";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabasePublishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (mode === "production" && (!supabaseUrl || !supabasePublishableKey)) {
    throw new Error("Production builds require VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  }

  const explicitPilotFlag = env.VITE_PILOT_MODE_ENABLED || process.env.VITE_PILOT_MODE_ENABLED;
  const vercelEnvironment = env.VERCEL_ENV || process.env.VERCEL_ENV;
  const vercelBranch = env.VERCEL_GIT_COMMIT_REF || process.env.VERCEL_GIT_COMMIT_REF;
  const vercelSha = env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local";
  const approvedPreviewBranch = vercelEnvironment === "preview" && Boolean(vercelBranch && APPROVED_PILOT_PREVIEW_BRANCHES.has(vercelBranch));
  const approvedProductionBranch = vercelEnvironment === "production" && vercelBranch === APPROVED_PILOT_PRODUCTION_BRANCH;
  const pilotAuthorised = explicitPilotFlag === "true" || approvedPreviewBranch || approvedProductionBranch;
  const pilotModeEnabled = explicitPilotFlag === "false" ? "false" : pilotAuthorised ? "true" : "false";

  return {
    server: { host: "::", port: 8080 },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    define: {
      "import.meta.env.VITE_PILOT_MODE_ENABLED": JSON.stringify(pilotModeEnabled),
      "import.meta.env.VITE_BUILD_SHA": JSON.stringify(vercelSha),
      "import.meta.env.VITE_BUILD_BRANCH": JSON.stringify(vercelBranch || process.env.GITHUB_REF_NAME || "local"),
      "import.meta.env.VITE_DEPLOYMENT_ENV": JSON.stringify(vercelEnvironment || mode),
    },
    resolve: { alias: { "@": path.resolve(__dirname, "./src") }, dedupe: ["react", "react-dom"] },
  };
});
