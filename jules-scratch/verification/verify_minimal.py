import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Listen for all console events and print them
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        # Navigate to the local minimal test file
        await page.goto('http://localhost:8080/jules-scratch/test.html')

        # Wait for the map to be initialized
        print("Waiting for map to appear...")
        await page.wait_for_timeout(2000) # Add a delay to allow for rendering
        await expect(page.locator("#map .leaflet-pane-map-pane")).to_be_visible()
        print("Map appeared successfully!")

        await page.screenshot(path="jules-scratch/verification/minimal_test.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
