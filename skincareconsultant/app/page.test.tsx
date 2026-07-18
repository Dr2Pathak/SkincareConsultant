import { describe, it, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import HomePage from "./page";

async function renderHome() {
  const view = render(<HomePage />);
  // Let React 19 finish any deferred UI work before assertions / unmount.
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
  return view;
}

describe("Home", () => {
  it("renders landing heading and value prop", async () => {
    const { unmount } = await renderHome();
    expect(
      screen.getByRole("heading", { name: /^SkinSafe$/i }),
    ).toBeInTheDocument();
    const match = screen.getAllByText(/compatibility|routine|ingredients/i);
    expect(match.length).toBeGreaterThan(0);
    unmount();
  });

  it("renders links for product-check, routine, onboarding, chat", async () => {
    const { unmount } = await renderHome();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((el) => el.getAttribute("href") ?? "").join(" ");
    expect(hrefs).toMatch(/product-check|routine|onboarding|chat|ingredients/);
    unmount();
  });
});
