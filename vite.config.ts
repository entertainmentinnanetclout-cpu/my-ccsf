import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const explicitPilotFlag = process.env.VITE_PILOT_MODE_ENABLED;
  const approvedPreviewBranch =
    process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feature/controlled-pilot-mode";
  const pilotModeEnabled = explicitPilotFlag ?? (approvedPreviewBranch ? "true" : "false");

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
