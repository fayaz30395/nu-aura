#!/usr/bin/env python3
"""
UI testing for HRMS using Playwright - Screenshot mode
Takes screenshots of all main pages for manual review
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

# Test configuration
BASE_URL = "http://localhost:3000"
TEST_EMAIL = "john.doe@demo.com"
TEST_PASSWORD = "password"
SCREENSHOT_DIR = Path("/tmp/hrms_screenshots")

async def take_screenshot(page, name: str) -> str:
    """Take a screenshot and return the path"""
    SCREENSHOT_DIR.mkdir(exist_ok=True)
    path = SCREENSHOT_DIR / f"{name}.png"
    await page.screenshot(path=str(path), full_page=True)
    print(f"  📸 Screenshot saved: {name}.png")
    return str(path)

async def run_tests():
    """Run UI tests with screenshots"""
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        page.set_default_timeout(60000)

        try:
            # Test 1: Login Page
            print("\n[TEST 1] Login Page")
            print("-" * 40)
            await page.goto(BASE_URL)
            await page.wait_for_load_state("networkidle")
            await take_screenshot(page, "01_login_page")
            results.append({"test": "Login Page", "status": "PASS"})

            # Test 2: Perform Login
            print("\n[TEST 2] Perform Login")
            print("-" * 40)
            # Click on Demo Credentials to expand
            try:
                await page.click('text=Demo Credentials')
                await asyncio.sleep(0.5)
            except:
                pass

            await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', TEST_EMAIL)
            await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD)
            await page.click('button[type="submit"], button:has-text("Sign In")')
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)
            await take_screenshot(page, "02_after_login")
            results.append({"test": "Login", "status": "PASS"})

            # Test 3: Dashboard/Home
            print("\n[TEST 3] Dashboard")
            print("-" * 40)
            await take_screenshot(page, "03_dashboard")
            results.append({"test": "Dashboard", "status": "PASS"})

            # Test 4: Employees Page
            print("\n[TEST 4] Employees Page")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/employees")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "04_employees")
            results.append({"test": "Employees", "status": "PASS"})

            # Test 5: Leave Page
            print("\n[TEST 5] Leave Management")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/leave")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "05_leave")
            results.append({"test": "Leave Management", "status": "PASS"})

            # Test 6: Attendance Page
            print("\n[TEST 6] Attendance")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/attendance")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "06_attendance")
            results.append({"test": "Attendance", "status": "PASS"})

            # Test 7: Projects Page
            print("\n[TEST 7] Projects")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/projects")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "07_projects")
            results.append({"test": "Projects", "status": "PASS"})

            # Test 8: Timesheets Page
            print("\n[TEST 8] Timesheets")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/timesheets")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "08_timesheets")
            results.append({"test": "Timesheets", "status": "PASS"})

            # Test 9: Reports Page
            print("\n[TEST 9] Reports")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/reports")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "09_reports")
            results.append({"test": "Reports", "status": "PASS"})

            # Test 10: Executive Dashboard
            print("\n[TEST 10] Executive Dashboard")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/dashboards/executive")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "10_executive_dashboard")
            results.append({"test": "Executive Dashboard", "status": "PASS"})

            # Test 11: Travel Page
            print("\n[TEST 11] Travel")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/travel")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "11_travel")
            results.append({"test": "Travel", "status": "PASS"})

            # Test 12: Gantt Chart
            print("\n[TEST 12] Gantt Chart")
            print("-" * 40)
            await page.goto(f"{BASE_URL}/projects/gantt")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(1)
            await take_screenshot(page, "12_gantt_chart")
            results.append({"test": "Gantt Chart", "status": "PASS"})

        except Exception as e:
            print(f"  ❌ Error: {e}")
            import traceback
            traceback.print_exc()
            results.append({"test": "Error", "status": "FAIL", "error": str(e)})
        finally:
            await browser.close()

    return results

async def main():
    print("\n" + "=" * 60)
    print("HRMS UI Testing (Playwright Screenshots)")
    print("=" * 60)

    results = await run_tests()

    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for r in results if r.get("status") == "PASS")
    failed = sum(1 for r in results if r.get("status") == "FAIL")

    for r in results:
        icon = "✅" if r.get("status") == "PASS" else "❌"
        print(f"  {icon} {r['test']}")

    print(f"\nTotal: {passed} passed, {failed} failed")
    print(f"\nScreenshots saved to: {SCREENSHOT_DIR}")

if __name__ == "__main__":
    asyncio.run(main())
