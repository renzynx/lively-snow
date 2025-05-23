import { Link } from "@remix-run/react";
import { FileText, UserPlus } from "lucide-react";
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

export default function Register() {
  const [data, setData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
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
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join us to start managing your files securely
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setIsLoading(true);

              const { username, email, password, repeat_password } = data;

              if (!username || !email || !password || !repeat_password) {
                toast.error("Please fill in all fields");
                setIsLoading(false);
                return;
              }

              if (password !== repeat_password) {
                toast.error("Passwords do not match");
                setIsLoading(false);
                return;
              }

              try {
                const res = await fetch("/api/auth/register", {
                  credentials: "include",
                  method: "POST",
                  body: JSON.stringify({ username, email, password }),
                  headers: {
                    "Content-Type": "application/json",
                  },
                });

                const registerData = await res.json();

                if (registerData.success) {
                  toast.success(
                    "Account created successfully! You can now sign in.",
                  );
                  window.location.href = "/auth/login";
                  return;
                }

                toast.error(registerData.message || "Registration failed");
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
                  Sign up
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Choose a username"
                    value={data.username || ""}
                    onChange={(e) =>
                      setData((data) => ({
                        ...data,
                        username: e.target.value,
                      }))
                    }
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={data.email || ""}
                    onChange={(e) =>
                      setData((data) => ({
                        ...data,
                        email: e.target.value,
                      }))
                    }
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
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
                <div className="space-y-2">
                  <Label htmlFor="repeat_password">Confirm Password</Label>
                  <Input
                    id="repeat_password"
                    name="repeat_password"
                    type="password"
                    placeholder="Confirm your password"
                    value={data.repeat_password || ""}
                    onChange={(e) =>
                      setData((data) => ({
                        ...data,
                        repeat_password: e.target.value,
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
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create account
                    </>
                  )}
                </Button>
                <div className="text-center text-sm">
                  <span className="text-muted-foreground">
                    Already have an account?{" "}
                  </span>
                  <Link
                    to="/auth/login"
                    className="text-primary hover:text-primary/80 hover:underline font-medium"
                  >
                    Sign in
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
