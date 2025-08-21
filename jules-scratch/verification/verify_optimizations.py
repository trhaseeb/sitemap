import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the local web server
        await page.goto('http://localhost:8080')

        # Wait for the map to be initialized
        await expect(page.locator("#map .leaflet-pane-map-pane")).to_be_visible()

        # 1. Add a new category
        await page.get_by_role("button", name="Manage Categories").click()
        await page.get_by_role("button", name="Add New Category").click()
        await page.locator("#modal-body input[type='text']").fill("Test Category")
        await page.get_by_role("button", name="Save").click()
        await page.get_by_role("button", name="×").click() # Close category manager

        # 2. Draw a polygon
        await page.locator(".leaflet-draw-draw-polygon").click()
        map_canvas = page.locator("#map")
        await map_canvas.click(position={"x": 400, "y": 200})
        await map_canvas.click(position={"x": 500, "y": 200})
        await map_canvas.click(position={"x": 500, "y": 300})
        await map_canvas.click(position={"x": 400, "y": 300})
        await map_canvas.click(position={"x": 400, "y": 200}) # Finish drawing

        # 3. Fill in feature details
        await expect(page.locator("#modal-title", has_text="New Feature Details")).to_be_visible()
        await page.locator("#Name").fill("Test Polygon")
        # The description is a Quill editor, so we target its content area
        await page.locator(".ql-editor").fill("This is a test polygon.")
        await page.get_by_role("button", name="Save").click()

        # Wait for the feature to appear in the legend
        await expect(page.locator(".legend-item", has_text="Test Polygon")).to_be_visible()

        # 4. Add an observation
        # First, click the feature on the map to open its popup
        # Note: Clicking the exact polygon can be tricky, so we click the legend item instead
        await page.locator(".legend-item", has_text="Test Polygon").click()
        await expect(page.locator(".leaflet-popup-content-wrapper")).to_be_visible()

        # Click the "Edit Props" button inside the popup
        await page.get_by_role("button", name="Edit Props").click()
        await expect(page.locator("#modal-title", has_text="Edit Feature")).to_be_visible()

        # Add an observation
        await page.get_by_role("button", name="Add Observation").click()
        await expect(page.locator("#observation-modal-title", has_text="Add Observation")).to_be_visible()
        await page.locator("#observation-modal #severity").select_option("High")
        await page.locator("#observation-modal .ql-editor").fill("High severity observation.")
        await page.locator("#observation-modal button", has_text="Save").click()

        # Close the main edit modal
        await page.get_by_role("button", name="Close").click()

        # 5. Test filtering
        # The observation icon should now be visible
        await expect(page.locator(".legend-item .observation-icon")).to_be_visible()

        # Hide the category
        await page.locator(".category-visibility-toggle").uncheck()
        await expect(page.locator(".legend-item", has_text="Test Polygon")).not_to_be_visible()

        # Show the category again
        await page.locator(".category-visibility-toggle").check()
        await expect(page.locator(".legend-item", has_text="Test Polygon")).to_be_visible()

        # Final screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
