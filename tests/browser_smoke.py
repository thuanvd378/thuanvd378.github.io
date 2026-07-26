from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:4173"
OUTPUT = Path(__file__).resolve().parent.parent / "qa" / "screenshots"
OUTPUT.mkdir(parents=True, exist_ok=True)


def inspect_page(page, url, name, width, height, full_page=True):
    errors = []
    failed_local = []

    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    page.on(
        "console",
        lambda message: errors.append(f"console.{message.type}: {message.text}")
        if message.type == "error"
        and not message.text.startswith("Failed to load resource:")
        else None,
    )

    def record_response(response):
        parsed = urlparse(response.url)
        if parsed.hostname in {"127.0.0.1", "localhost"} and response.status >= 400:
            failed_local.append(f"{response.status} {response.url}")

    page.on("response", record_response)
    page.set_viewport_size({"width": width, "height": height})
    response = page.goto(url, wait_until="domcontentloaded", timeout=30_000)
    assert response and response.ok, f"Main request failed: {url}"
    page.wait_for_timeout(3_000)

    overflow = page.evaluate(
        "() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth"
    )
    assert overflow <= 2, f"{name}: horizontal overflow {overflow}px"
    assert not failed_local, f"{name}: failed local assets: {failed_local}"
    assert not errors, f"{name}: browser errors: {errors}"
    page.screenshot(path=str(OUTPUT / f"{name}-{width}x{height}.png"), full_page=full_page)


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()

        desktop = browser.new_page()
        inspect_page(desktop, f"{BASE_URL}/", "home", 1440, 1000)
        assert desktop.locator("#public-repo-count").inner_text().strip() == "24"
        assert desktop.locator(".repo-row").count() >= 6
        desktop.locator("#repo-query").fill("iot")
        desktop.wait_for_timeout(150)
        assert desktop.locator(".repo-row").count() >= 1
        desktop.locator("#repo-query").fill("")
        desktop.get_by_role("button", name="Embedded / IoT").click()
        desktop.wait_for_timeout(150)
        assert desktop.locator(".repo-row").count() >= 1

        mobile = browser.new_page()
        inspect_page(mobile, f"{BASE_URL}/", "home", 390, 844, full_page=False)
        assert mobile.locator("h1").is_visible()
        assert mobile.locator(".portrait img").is_visible()

        project = browser.new_page()
        inspect_page(
            project,
            f"{BASE_URL}/project.html?repo=write-me-a-readme",
            "project-write-me-a-readme",
            1440,
            1000,
        )
        assert "Resolving" not in project.locator("#project-title").inner_text()
        assert project.locator(".readme-section").count() >= 5
        assert project.locator("#readme-toc a").count() >= 3
        assert project.locator("#project-media:not([hidden])").count() == 1

        project_mobile = browser.new_page()
        inspect_page(
            project_mobile,
            f"{BASE_URL}/project.html?repo=ossmark",
            "project-ossmark",
            390,
            844,
            full_page=False,
        )
        assert project_mobile.locator(".readme-section").count() >= 2

        missing = browser.new_page()
        inspect_page(
            missing,
            f"{BASE_URL}/project.html?repo=this-repository-does-not-exist",
            "project-missing",
            390,
            844,
            full_page=False,
        )
        assert "Signal not found" in missing.locator("#project-title").inner_text()

        browser.close()
        print("Browser smoke checks passed.")


if __name__ == "__main__":
    main()
