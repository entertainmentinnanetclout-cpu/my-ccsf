import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ccsfLogo from "@/assets/ccsf-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, hsl(0 72% 51%) 0%, hsl(0 84% 40%) 50%, hsl(0 72% 35%) 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <motion.img
          src={ccsfLogo}
          alt="CCSF Logo"
          className="h-24 w-24 mx-auto mb-6 drop-shadow-lg"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        />
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-white" />
          <h1 className="text-5xl font-bold text-white">404</h1>
        </div>
        <p className="text-xl text-white/90 mb-2 font-semibold">Area Not Found</p>
        <p className="text-white/70 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild variant="secondary" size="lg" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Return to Safety
          </Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
