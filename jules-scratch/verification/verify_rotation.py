import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Listen for all console events and print them
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        # Navigate to the local web server
        await page.goto('http://localhost:8080')

        # Wait for the map to be initialized
        await expect(page.locator("#map .leaflet-pane-map-pane")).to_be_visible()

        # Check that the rotation controls are visible
        await expect(page.locator(".leaflet-control-rotate")).to_be_visible()

        # 1. Add a category and a feature to have something to see
        await page.get_by_role("button", name="Manage Categories").click()
        await page.get_by_role("button", name="Add New Category").click()
        await page.locator("#modal-body input[type='text']").fill("Rotation Test")
        await page.get_by_role("button", name="Save").click()
        await page.get_by_role("button", name="×").click()

        await page.locator(".leaflet-draw-draw-polygon").click()
        map_canvas = page.locator("#map")
        await map_canvas.click(position={"x": 300, "y": 250})
        await map_canvas.click(position={"x": 400, "y": 250})
        await map_canvas.click(position={"x": 350, "y": 350})
        await map_canvas.click(position={"x": 300, "y": 250})

        await page.locator("#Name").fill("Base Polygon")
        await page.get_by_role("button", name="Save").click()
        await expect(page.locator(".legend-item", has_text="Base Polygon")).to_be_visible()

        # 2. Rotate the map
        # Click the rotate button multiple times to get a noticeable rotation
        rotate_button = page.locator("a.leaflet-control-rotate-toggle")
        for _ in range(4):
            await rotate_button.click()
            await page.wait_for_timeout(200) # Wait for animation

        # Take a screenshot to verify rotation
        await page.screenshot(path="jules-scratch/verification/rotation_step1.png")

        # 3. Draw a new feature (a line) while rotated
        await page.locator(".leaflet-draw-draw-polyline").click()
        await map_canvas.click(position={"x": 500, "y": 200})
        await map_canvas.click(position={"x": 600, "y": 300})
        await map_canvas.click(position={"x": 600, "y": 300}) # Double click to finish

        await expect(page.locator("#modal-title", has_text="New Feature Details")).to_be_visible()
        await page.locator("#Name").fill("Rotated Line")
        await page.get_by_role("button", name="Save").click()

        # Take final screenshot
        await page.screenshot(path="jules-scratch/verification/rotation_step2.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
