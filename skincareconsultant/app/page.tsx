import Link from "next/link"
import {
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Network,
  ArrowRight,
  Shield,
  Zap,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Target,
    title: "Build Your Routine",
    description:
      "Organize your AM and PM skincare steps, track products, and get insights on your routine health.",
    href: "/routine",
    cta: "Start Building",
  },
  {
    icon: CheckCircle2,
    title: "Check Product Compatibility",
    description:
      "Before you buy, check if a product works with your skin type, concerns, and existing routine.",
    href: "/product-check",
    cta: "Check a Product",
  },
  {
    icon: MessageCircle,
    title: "Chat with Your Consultant",
    description:
      "Ask questions about ingredients, get routine advice, and learn what works for your skin.",
    href: "/chat",
    cta: "Start Chatting",
  },
  {
    icon: Network,
    title: "Explore Ingredient Map",
    description:
      "Discover how ingredients relate to each other, which ones conflict, and which help your concerns.",
    href: "/ingredients",
    cta: "Explore Map",
  },
]

const benefits = [
  {
    icon: Shield,
    title: "Avoid Irritation",
    description: "Identify conflicts between actives before they cause problems.",
  },
  {
    icon: Zap,
    title: "Maximize Results",
    description: "Ensure products complement each other for optimal benefits.",
  },
  {
    icon: Sparkles,
    title: "Personalized Guidance",
    description: "Recommendations based on your unique skin profile.",
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/50 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your Personal Skincare Consultant
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Check product compatibility, build smarter routines, and understand your ingredients.
            Routine-centric guidance that puts your skin first.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/onboarding">
                Set Up Your Profile
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/product-check">Check a Product</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Trusted by skincare enthusiasts. Built with evidence-based ingredient data.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="border-y border-border bg-card px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <benefit.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything You Need for Smarter Skincare
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
              From building your routine to checking compatibility, we help you make informed decisions.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-8">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{feature.description}</p>
                <div className="mt-4">
                  <Link
                    href={feature.href}
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    {feature.cta}
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-2xl font-bold text-primary-foreground sm:text-3xl">
            Ready to Optimize Your Routine?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-primary-foreground/80">
            Set up your profile in minutes and start getting personalized skincare guidance today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/onboarding">Get Started Free</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/ingredients">Explore Ingredients</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
