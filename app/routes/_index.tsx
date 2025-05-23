import type { MetaFunction } from "@remix-run/node";
import {
  ArrowRight,
  Check,
  FileText,
  Shield,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { Layout } from "~/components/Layout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const meta: MetaFunction = () => {
  return [
    { title: "FileManager - Secure File Management Made Simple" },
    {
      name: "description",
      content:
        "Upload, manage, and share your files securely with our modern file management platform.",
    },
  ];
};

export default function Index() {
  const features = [
    {
      icon: Upload,
      title: "Easy Upload",
      description:
        "Drag and drop files up to 15GB with chunked upload technology",
    },
    {
      icon: Shield,
      title: "Secure Storage",
      description:
        "Your files are encrypted and stored securely with enterprise-grade security",
    },
    {
      icon: Zap,
      title: "Fast Access",
      description: "Lightning-fast file retrieval and download speeds",
    },
    {
      icon: Users,
      title: "User Friendly",
      description:
        "Intuitive interface designed for both beginners and power users",
    },
  ];

  const benefits = [
    "Upload files up to 15GB",
    "Secure encrypted storage",
    "Fast download speeds",
    "Mobile responsive design",
    "Real-time upload progress",
    "File organization tools",
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Secure File Management
              <span className="block text-primary">Made Simple</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Upload, organize, and manage your files with confidence. Our
              platform provides enterprise-grade security with a user-friendly
              interface that makes file management effortless.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" asChild>
                <a href="/upload" className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Start Uploading
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="/files" className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  View My Files
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need for file management
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Powerful features designed to make your file management experience
              seamless and secure.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="relative overflow-hidden border-0 bg-muted/50"
                >
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                      <Icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-6">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-muted/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Why choose our platform?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Built with modern technology and best practices, our file
                management platform offers unmatched reliability and user
                experience.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <a href="/auth/register" className="flex items-center gap-2">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Join thousands of users who trust our platform for their file
              management needs.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" asChild>
                <a href="/auth/register">Create Account</a>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <a href="/auth/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
