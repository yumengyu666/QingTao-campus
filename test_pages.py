from playwright.sync_api import sync_playwright
import sys

def test_page(browser, url, name):
    page = browser.new_page()
    page.on("console", lambda msg: print(f"[{name}] CONSOLE {msg.type}: {msg.text}") if msg.type == "error" or msg.type == "warning" else None)
    page.on("pageerror", lambda err: print(f"[{name}] PAGE ERROR: {err}"))
    try:
        page.goto(url, timeout=10000)
        page.wait_for_load_state('networkidle', timeout=10000)
        page.wait_for_timeout(2000)
        title = page.title()
        print(f"[{name}] ✅ Title: {title}")
        # Check for error boundary
        error_div = page.locator('[class*="error"], [class*="ErrorBoundary"], .text-red-500').first
        if error_div.count() > 0:
            text = error_div.text_content() or ''
            if len(text) > 5:
                print(f"[{name}] ⚠️ Error text: {text[:200]}")
        page.screenshot(path=f'/tmp/test_{name.replace("/","_")}.png', full_page=False)
    except Exception as e:
        print(f"[{name}] ❌ FAILED: {e}")
        page.screenshot(path=f'/tmp/test_{name.replace("/","_")}.png', full_page=False)
    page.close()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    pages = [
        ('http://localhost:5175/agent', 'agent'),
        ('http://localhost:5175/square', 'square'),
        ('http://localhost:5175/explore', 'explore'),
        ('http://localhost:5175/video', 'video'),
        ('http://localhost:5175/login', 'login'),
    ]
    for url, name in pages:
        test_page(browser, url, name)
    browser.close()
