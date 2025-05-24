import { Link, useNavigate } from "@remix-run/react";
import { FileText, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Layout } from "~/components/Layout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function Login() {
  const [data, setData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);

              const { email_username, password } = data;

              if (!email_username || !password) {
                setIsLoading(false);
                return;
              }

              try {
                const res = await fetch("/api/auth/login", {
                  credentials: "include",
                  method: "POST",
                  body: JSON.stringify({ email: email_username, password }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                });

                if (!res.ok) {
                  const error = await res.json();
                  console.log(error);
                  setIsLoading(false);
                  return;
                }

                const loginData = await res.json();

                if (loginData.success) {
                  return navigate("/upload");
                }

                toast.error(loginData.message);
              } catch (error) {
                toast.error("An error occurred. Please try again.");
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-semibold">
                  Sign in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email_username">Email or Username</Label>
                  <Input
                    id="email_username"
                    name="email_username"
                    type="text"
                    placeholder="Enter your email or username"
                    value={data.email_username || ""}
                    onChange={(e) =>
                      setData((data) => ({
                        ...data,
                        email_username: e.target.value,
                      }))
                    }
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      to="#"
                      className="text-sm text-primary hover:text-primary/80 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={data.password || ""}
                    onChange={(e) =>
                      setData((data) => ({
                        ...data,
                        password: e.target.value,
                      }))
                    }
                    className="h-11"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign in
                    </>
                  )}
                </Button>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Don't have an account?{" "}
                  </span>
                  <Link
                    to="/auth/register"
                    className="text-primary hover:text-primary/80 hover:underline font-medium"
                  >
                    Sign up
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </form>

          {/* Back to home link */}
          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
