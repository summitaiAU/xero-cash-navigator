import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import SodhiLogo from "@/assets/sodhi-logo.svg";

function mergeUrlParams(): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((v, k) => params.set(k, v));
  }
  return params;
}

const ResetPasswordVerify = () => {
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [message, setMessage] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Verify Reset Link | Sodhi";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Verifying your Sodhi password reset link");
  }, []);

  useEffect(() => {
    const verify = async () => {
      try {
        const params = mergeUrlParams();
        const urlError = params.get("error");
        const urlErrorDesc = params.get("error_description");
        if (urlError) {
          throw new Error(urlErrorDesc || urlError);
        }

        const type = params.get("type");
        const tokenHash = params.get("token_hash");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        // Preferred flow: verify one-time token
        if (tokenHash && type === "recovery") {
          const { data, error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          if (error) throw error;
          if (!data?.session) {
            // Some projects may not return a session here; try to get it
            const { data: sessData } = await supabase.auth.getSession();
            if (!sessData.session) throw new Error("Verification succeeded but no session was created.");
          }
          toast({ title: "Link verified", description: "You can now update your password." });
          navigate("/update-password", { replace: true });
          return;
        }

        // Fallback flow: set session from access_token
        if (accessToken && refreshToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          toast({ title: "Link verified", description: "You can now update your password." });
          navigate("/update-password", { replace: true });
          return;
        }

        throw new Error("Invalid or missing parameters in the reset link.");
      } catch (err: any) {
        console.error("Reset verification error:", err);
        setMessage(err.message || "The reset link is invalid or has expired.");
        setStatus("error");
      }
    };

    verify();
  }, [navigate]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={SodhiLogo} alt="Sodhi Logo" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying link...</CardTitle>
            <CardDescription>Please wait while we verify your reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={SodhiLogo} alt="Sodhi Logo" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Invalid or expired link</CardTitle>
          <CardDescription>We couldn't verify your reset link</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <p className="text-sm">{message || "This link is invalid or has expired. Please request a new one."}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => navigate("/forgot-password")}>Request new link</Button>
              <Button className="flex-1" variant="outline" onClick={() => navigate("/auth")}>Back to login</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordVerify;
