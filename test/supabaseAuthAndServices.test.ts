import { test } from "node:test";
import assert from "node:assert/strict";
import { historyService } from "../src/services/historyService.js";
import { savedLocationsService } from "../src/services/savedLocationsService.js";
import { preferencesService } from "../src/services/preferencesService.js";
import { authService } from "../src/services/auth.js";
import { LocationInfo } from "../src/types.js";

test("1. historyService: generateTitle creates clean titles with location and query", () => {
  const loc: LocationInfo = {
    name: "Mumbai",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
  };

  const title1 = historyService.generateTitle("Will it rain heavily today?", loc);
  assert.equal(title1, "Will it rain heavily today");

  const title2 = historyService.generateTitle("Weather check");
  assert.equal(title2, "Weather check");

  const title3 = historyService.generateTitle("", loc);
  assert.equal(title3, "Mumbai Weather");
});

test("2. historyService: generateTitle truncates long queries at 50 chars cleanly", () => {
  const longQuery = "Can you tell me if there is any chance of a thunderstorm or cyclone hitting the coastal areas this weekend?";
  const title = historyService.generateTitle(longQuery);
  assert.ok(title.length <= 55);
  assert.ok(title.endsWith("..."));
});

test("3. savedLocationsService: handles local storage for guest sessions seamlessly", async () => {
  const loc: LocationInfo = {
    name: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
  };

  const saved = await savedLocationsService.saveLocation("guest_user", true, loc);
  assert.equal(saved, true);

  const list = await savedLocationsService.getSavedLocations("guest_user", true);
  assert.ok(Array.isArray(list));
  const found = list.find((l) => l.name === "Tokyo");
  assert.ok(found);
  assert.equal(found.latitude, 35.6762);

  const removed = await savedLocationsService.removeLocation("guest_user", true, loc);
  assert.equal(removed, true);
});

test("4. preferencesService: returns defaults when unconfigured or guest", async () => {
  const prefs = await preferencesService.getPreferences("guest_user", true);
  assert.ok(prefs);
  assert.equal(typeof prefs.preferred_language, "string");
  assert.equal(typeof prefs.is_fahrenheit, "boolean");
  assert.ok(prefs.theme === "dark" || prefs.theme === "light");
});

test("5. authService: initializes in guest mode with safe profile", () => {
  const user = authService.getCurrentUser();
  assert.ok(user);
  assert.equal(user.isGuest, true);
  assert.equal(user.id, "guest-user");
  assert.equal(user.plan, "Free");
});

test("6. authService: logout resets to a clean guest profile", () => {
  authService.logout();
  const user = authService.getCurrentUser();
  assert.ok(user);
  assert.equal(user.isGuest, true);
});
