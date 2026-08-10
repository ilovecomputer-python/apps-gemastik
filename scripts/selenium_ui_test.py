# -*- coding: utf-8 -*-
"""Selenium web-automation test for AURA Marketplace.

Drives the real UI (not the API) as two fresh personas: a new buyer and a
new seller/brand applicant. Each step is isolated in try/except so one
failure doesn't abort the whole run; results are collected and printed as
a summary plus written to docs/selenium/results.json.

Requirements: `pip install selenium`, a local Chrome install, and both dev
servers running (`npm run dev` in the repo root, `npm run dev` in server/).

Usage:
    python scripts/selenium_ui_test.py
"""
import json
import os
import sys
import time
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://localhost:5173"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(REPO_ROOT, "docs", "selenium")
os.makedirs(OUT_DIR, exist_ok=True)

results = []


def record(name, ok, detail=""):
    results.append({"step": name, "ok": ok, "detail": detail})
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))


def shot(driver, name):
    try:
        driver.save_screenshot(os.path.join(OUT_DIR, f"{name}.png"))
    except Exception:
        pass


def make_driver():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--window-size=430,900")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--log-level=3")
    opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})
    return webdriver.Chrome(options=opts)


def dump_console(driver, label):
    try:
        entries = driver.get_log("browser")
        bad = [e for e in entries if e.get("level") in ("SEVERE", "WARNING")]
        if bad:
            print(f"  console ({label}):")
            for e in bad[-8:]:
                print("   ", e.get("level"), str(e.get("message"))[:200])
    except Exception:
        pass


def wait_grid_settled(driver, timeout=8):
    """Wait until the product grid shows cards, an empty-state, or an error - not stuck loading."""
    return WebDriverWait(driver, timeout).until(
        lambda d: d.find_elements(By.CSS_SELECTOR, ".grid .card")
        or d.find_elements(By.CSS_SELECTOR, ".empty-state")
    )


def wait_visible(driver, by, sel, timeout=10):
    return WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((by, sel)))


def wait_clickable(driver, by, sel, timeout=10):
    return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((by, sel)))


def run_buyer_flow(driver, stamp):
    email = f"selenium.buyer.{stamp}@ujicoba.id"
    try:
        driver.get(BASE_URL)
        cta = wait_clickable(driver, By.CSS_SELECTOR, ".landing-cta")
        record("Landing page loads with entry CTA", True)
    except Exception as e:
        record("Landing page loads with entry CTA", False, str(e))
        return

    try:
        cta.click()
        wait_visible(driver, By.CSS_SELECTOR, ".auth-form")
        record("Tap 'Masuk ke AURA' reaches Login screen", True)
    except Exception as e:
        record("Tap 'Masuk ke AURA' reaches Login screen", False, str(e))
        return

    try:
        driver.find_element(By.CSS_SELECTOR, ".auth-footer .link-btn:not(.muted)").click()
        wait_visible(driver, By.CSS_SELECTOR, ".auth-role-tabs")
        record("'Belum punya akun? Daftar' reaches Register screen", True)
    except Exception as e:
        record("'Belum punya akun? Daftar' reaches Register screen", False, str(e))
        return

    try:
        inputs = driver.find_elements(By.CSS_SELECTOR, ".auth-form input")
        inputs[0].send_keys("Selenium Buyer")
        inputs[1].send_keys(email)
        inputs[2].send_keys("Password123")
        driver.find_element(By.CSS_SELECTOR, ".auth-form button[type=submit]").click()
        wait_visible(driver, By.CSS_SELECTOR, ".search-input", timeout=15)
        record("Register as buyer -> lands on Home", True, email)
        shot(driver, "buyer_home")
    except Exception as e:
        record("Register as buyer -> lands on Home", False, str(e))
        return

    try:
        wait_grid_settled(driver, timeout=8)  # let the initial "Semua" fetch settle first
        skincare_chip = driver.find_element(By.XPATH, "//button[contains(@class,'chip') and normalize-space()='Skincare']")
        skincare_chip.click()
        wait_grid_settled(driver, timeout=8)
        cards = driver.find_elements(By.CSS_SELECTOR, ".grid .card")
        record("Filter by 'Skincare' category returns products", len(cards) > 0, f"{len(cards)} cards")
        if not cards:
            shot(driver, "buyer_skincare_filter_empty")
            dump_console(driver, "skincare filter")
    except Exception as e:
        record("Filter by 'Skincare' category returns products", False, str(e))
        dump_console(driver, "skincare filter (exception)")

    try:
        all_chip = driver.find_element(By.XPATH, "//button[contains(@class,'chip') and normalize-space()='Semua']")
        all_chip.click()
        wait_grid_settled(driver, timeout=8)
        search = driver.find_element(By.CSS_SELECTOR, ".search-input")
        search.send_keys("serum")
        time.sleep(0.6)  # let the 300ms debounce fire
        wait_grid_settled(driver, timeout=8)
        cards = driver.find_elements(By.CSS_SELECTOR, ".grid .card, .empty-state")
        record("Search box accepts input and re-queries", len(cards) > 0)
        if not cards:
            dump_console(driver, "search")
        search.clear()
        time.sleep(0.6)
        wait_grid_settled(driver, timeout=8)
    except Exception as e:
        record("Search box accepts input and re-queries", False, str(e))
        dump_console(driver, "search (exception)")

    try:
        wait_grid_settled(driver, timeout=8)
        first_card = wait_clickable(driver, By.CSS_SELECTOR, ".grid .card", timeout=10)
        product_name = first_card.find_element(By.CSS_SELECTOR, ".name").text
        first_card.click()
        wait_visible(driver, By.CSS_SELECTOR, ".detail-name", timeout=8)
        record("Open product detail page", True, product_name)
        shot(driver, "buyer_product_detail")
    except Exception as e:
        record("Open product detail page", False, str(e))
        dump_console(driver, "product detail (exception)")
        shot(driver, "buyer_product_detail_FAILED")
        return

    try:
        wishlist_btn = driver.find_element(By.CSS_SELECTOR, ".wishlist-dot.static")
        wishlist_btn.click()
        time.sleep(0.5)
        active = "active" in wishlist_btn.get_attribute("class")
        record("Toggle wishlist on product detail", active)
    except Exception as e:
        record("Toggle wishlist on product detail", False, str(e))

    try:
        add_btn = driver.find_element(By.CSS_SELECTOR, ".cart-add-btn")
        add_btn.click()
        WebDriverWait(driver, 5).until(lambda d: "Ditambahkan" in add_btn.text)
        record("Add to cart shows confirmation", True)
    except Exception as e:
        record("Add to cart shows confirmation", False, str(e))

    try:
        driver.find_element(By.CSS_SELECTOR, ".back-btn").click()
        wait_visible(driver, By.CSS_SELECTOR, ".search-input")
        driver.find_element(By.CSS_SELECTOR, ".icon-btn[aria-label='Keranjang']").click()
        wait_visible(driver, By.CSS_SELECTOR, ".cart-list, .empty-state")
        cart_items = driver.find_elements(By.CSS_SELECTOR, ".cart-item")
        record("Cart page shows the added item", len(cart_items) >= 1, f"{len(cart_items)} item(s)")
        shot(driver, "buyer_cart")
    except Exception as e:
        record("Cart page shows the added item", False, str(e))


def run_seller_flow(driver, stamp):
    email = f"selenium.seller.{stamp}@ujicoba.id"
    try:
        driver.delete_all_cookies()
        driver.execute_script("window.localStorage.clear();")
        driver.get(BASE_URL)
        cta = wait_clickable(driver, By.CSS_SELECTOR, ".landing-cta")
        cta.click()
        driver.find_element(By.CSS_SELECTOR, ".auth-footer .link-btn:not(.muted)").click()
        wait_visible(driver, By.CSS_SELECTOR, ".auth-role-tabs")
        record("Reset session -> fresh visitor reaches Register", True)
    except Exception as e:
        record("Reset session -> fresh visitor reaches Register", False, str(e))
        return

    try:
        driver.find_element(By.XPATH, "//button[contains(@class,'auth-role-tab') and contains(.,'Penjual')]").click()
        inputs = driver.find_elements(By.CSS_SELECTOR, ".auth-form input")
        inputs[0].send_keys("Selenium Seller")
        inputs[1].send_keys(email)
        inputs[2].send_keys("Password123")
        driver.find_element(By.CSS_SELECTOR, ".auth-form button[type=submit]").click()
        wait_visible(driver, By.CSS_SELECTOR, ".empty-state-cta", timeout=15)
        record("Register as seller -> lands on Seller Center", True, email)
        shot(driver, "seller_center_empty")
    except Exception as e:
        record("Register as seller -> lands on Seller Center", False, str(e))
        return

    try:
        driver.find_element(By.CSS_SELECTOR, ".empty-state-cta").click()
        wait_visible(driver, By.CSS_SELECTOR, "input[name=name]")
        record("'Daftarkan brand' reaches the application form", True)
    except Exception as e:
        record("'Daftarkan brand' reaches the application form", False, str(e))
        return

    try:
        brand_name = f"Selenium Test Brand {stamp}"
        driver.find_element(By.NAME, "name").send_keys(brand_name)
        driver.find_element(By.NAME, "tagline").send_keys("Brand percobaan otomasi Selenium untuk QA")
        driver.find_element(By.NAME, "story").send_keys(
            "Ini adalah cerita brand percobaan yang dibuat otomatis oleh skrip pengujian Selenium untuk memverifikasi alur pendaftaran brand baru berjalan baik."
        )
        driver.find_element(By.NAME, "city").send_keys("Yogyakarta")
        driver.find_element(By.NAME, "contactName").send_keys("QA Selenium")
        driver.find_element(By.NAME, "contactEmail").send_keys(email)
        driver.find_element(By.CSS_SELECTOR, ".auth-form button[type=submit]").click()
        wait_visible(driver, By.XPATH, "//h3[contains(text(),'Pendaftaran terkirim')]", timeout=10)
        record("Submit brand application succeeds", True, brand_name)
        shot(driver, "seller_brand_submitted")
    except Exception as e:
        record("Submit brand application succeeds", False, str(e))


def main():
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    driver = make_driver()
    try:
        run_buyer_flow(driver, stamp)
        run_seller_flow(driver, stamp)
    finally:
        driver.quit()

    passed = sum(1 for r in results if r["ok"])
    total = len(results)
    print(f"\n{passed}/{total} steps passed")

    out_path = os.path.join(OUT_DIR, "results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"passed": passed, "total": total, "results": results}, f, indent=2, ensure_ascii=False)

    if passed < total:
        sys.exit(1)


if __name__ == "__main__":
    main()
