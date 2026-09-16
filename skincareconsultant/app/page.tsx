import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const journeys = [
  {
    title: "Build your routine",
    description: "Lay out AM and PM steps, keep products in order, and see how they sit together.",
    href: "/routine",
    cta: "Open routine",
  },
  {
    title: "Check before you buy",
    description: "Compare a product to your profile and routine so conflicts show up early.",
    href: "/product-check",
    cta: "Check a product",
  },
  {
    title: "Ask a clear question",
    description: "Get ingredient and routine guidance grounded in your current setup.",
    href: "/chat",
    cta: "Open chat",
  },
  {
    title: "See ingredient links",
    description: "Browse how ingredients conflict or support each other on the map.",
    href: "/ingredients",
    cta: "View map",
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="relative min-h-[78vh] overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[url('/hero-barrier.svg')] bg-cover bg-[center_top] bg-no-repeat"
          aria-hidden="true"
        />
        <div className="page-shell flex min-h-[58vh] flex-col justify-center">
          <h1 className="font-display text-5xl font-semibold tracking-tight text-foreground motion-fade-up sm:text-6xl lg:text-7xl">
            SkinSafe
          </h1>
          <div className="barrier-rule mt-5 motion-fade-up motion-delay-1" aria-hidden="true" />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground motion-fade-up motion-delay-2 sm:text-xl">
            Know what belongs in your routine before it lands on your face.
          </p>
          <div className="mt-10 flex flex-col gap-3 motion-fade-up motion-delay-3 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link href="/onboarding">
                Set up your profile
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/product-check">Check a product</Link>
            </Button>
          </div>
          <p className="mt-6 max-w-md text-sm text-muted-foreground motion-fade-up motion-delay-4">
            Educational only — not a diagnosis. Patch test new products.
          </p>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/40 px-4 py-14 sm:px-6 lg:px-8">
        <div className="page-shell">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Start where you are
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Four paths. Same goal: fewer surprises when you introduce a new product.
          </p>

          <ul className="mt-10 divide-y divide-border/80 border-y border-border/80">
            {journeys.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex flex-col gap-2 py-6 transition-colors hover:bg-accent/40 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8 sm:px-2"
                >
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center text-sm font-medium text-primary">
                    {item.cta}
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="page-shell">
          <div className="max-w-2xl border-l-2 border-primary/40 pl-6 sm:pl-8">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Ready when your shelf is.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Save a profile, build an AM/PM routine, then check products against what you already use.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/onboarding">Get started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/ingredients">Explore ingredients</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
