"""Layout regression check (real browser geometry). Run against a running app:
    python3 scripts/layout-geometry.py http://localhost:8080
Checks Rights Desk topic name/context never overlap, and Presence sticky bars never cover
anchor/focus targets, at 390, 1280 and 1920 widths. Exits non-zero on failure."""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
RIGHTS = """()=>[...document.querySelectorAll('.rights-topics button')].map(b=>{const r=b.getBoundingClientRect(),s=b.querySelector('strong').getBoundingClientRect(),m=b.querySelector('small').getBoundingClientRect(),i=b.querySelector('svg').getBoundingClientRect();return s.bottom<=m.top+1&&s.right<=i.left+1&&m.right<=i.left+1&&s.right<=r.right&&m.right<=r.right})"""
CLEAR = """e=>e.getBoundingClientRect().top>=document.querySelector('.room-support-nav').getBoundingClientRect().bottom-1"""

async def main():
    failures = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for w, h in [(390, 844), (1280, 800), (1920, 1080)]:
            page = await browser.new_page(viewport={"width": w, "height": h})
            await page.goto(BASE + "/learn#rights", wait_until="networkidle")
            ok = await page.evaluate(RIGHTS)
            if not ok or not all(ok):
                failures.append(f"rights overlap at {w}px: {ok}")
            await page.goto(BASE + "/presence", wait_until="networkidle")
            heading = page.get_by_role("heading", name="Who’s picking up?")
            await heading.evaluate("e=>{e.closest('section').id='call-prep-check'}")
            await page.evaluate("location.hash='call-prep-check'")
            await page.wait_for_timeout(300)
            if not await heading.evaluate(CLEAR):
                failures.append(f"presence heading covered at {w}px")
            await page.evaluate("scrollTo(0,0)")
            for box in await page.locator(".call-consent input").all():
                await box.focus()
                await page.wait_for_timeout(100)
                if not await box.evaluate(CLEAR):
                    failures.append(f"focused consent covered at {w}px")
            await page.close()
        await browser.close()
    print("\n".join(failures) or "layout geometry OK")
    sys.exit(1 if failures else 0)

asyncio.run(main())
