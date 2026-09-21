import { test, expect } from "../../app/e2e/support/fixtures";
import { gotoAppShell, openSettings } from "../../app/e2e/support/helpers/app";

function readScrollTop(node: HTMLElement | SVGElement) {
  return node.scrollTop;
}

test.describe("Settings sidebar scrolling", () => {
  test.use({ viewport: { width: 900, height: 260 } });

  test("keeps the sidebar scroll position when switching settings sections", async ({ page }) => {
    await gotoAppShell(page);
    await openSettings(page);

    for (const section of ["providers", "terminals", "providers"]) {
      const scrollBody = page.locator('[data-testid="settings-sidebar-scroll-body"]:visible');
      const button = page.getByTestId(`settings-host-section-${section}`);
      await button.scrollIntoViewIfNeeded();
      const before = await scrollBody.evaluate(readScrollTop);
      expect(before).toBeGreaterThan(0);
      await button.click();
      await expect(page).toHaveURL(new RegExp(`/settings/hosts/[^/]+/${section}$`));
      await expect
        .poll(async () => Math.abs((await scrollBody.evaluate(readScrollTop)) - before))
        .toBeLessThanOrEqual(1);
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.paseoDesktop = {
        platform: "darwin",
        events: { on: () => () => {} },
        invoke: async (command: string) => {
          if (command === "get_desktop_settings") {
            return {
              releaseChannel: "stable",
              daemon: { manageBuiltInDaemon: true, keepRunningAfterQuit: true },
            };
          }
          return null;
        },
      };
    });
  });

  test("desktop drag region does not cover the scroll body", async ({ page }) => {
    await gotoAppShell(page);
    await openSettings(page);

    const sidebar = page.getByTestId("settings-sidebar");
    const scrollBody = page.getByTestId("settings-sidebar-scroll-body");
    await expect(sidebar).toBeVisible();
    await expect(scrollBody).toBeVisible();

    const geometry = await sidebar.evaluate((node) => {
      const scrollBodyElement = node.querySelector<HTMLElement>(
        '[data-testid="settings-sidebar-scroll-body"]',
      );
      if (!scrollBodyElement) return null;

      const scrollerRect = scrollBodyElement.getBoundingClientRect();
      const dragRegions = [];
      for (const element of node.querySelectorAll<HTMLElement>("*")) {
        if (getComputedStyle(element).getPropertyValue("-webkit-app-region") === "drag") {
          const rect = element.getBoundingClientRect();
          dragRegions.push({ bottom: rect.bottom });
        }
      }

      return {
        scrollBodyTop: scrollerRect.top,
        dragRegions,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.dragRegions).not.toEqual([]);
    for (const dragRegion of geometry!.dragRegions) {
      expect(dragRegion.bottom).toBeLessThanOrEqual(geometry!.scrollBodyTop + 1);
    }
  });
});
