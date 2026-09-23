import test from "node:test";
import assert from "node:assert/strict";
import {
  isNotificationSupported,
  getNotificationPermission,
  isSevereAdvisory,
  getAdvisoryAlertKey,
  clearNotifiedAlerts,
  triggerSevereAdvisoryNotification,
  processSevereAdvisories,
} from "../src/services/notificationService.js";
import { WeatherAdvisory } from "../src/types.js";

// Helper mock advisory factory
function createMockAdvisory(overrides: Partial<WeatherAdvisory> = {}): WeatherAdvisory {
  return {
    id: "adv-rain-1",
    type: "rain",
    severity: "severe",
    title: "Heavy Rainfall Warning",
    description: "Sustained heavy rainfall exceeding 50mm expected.",
    recommendation: "Avoid low-lying areas and secure vulnerable items.",
    timeframe: "Next 3 hours",
    locationName: "Mumbai",
    isOfficial: false,
    ...overrides,
  };
}

test("Notification Service - A. Advisory severity classification", () => {
  const severeAdv = createMockAdvisory({ severity: "severe" });
  const extremeAdv = createMockAdvisory({ severity: "extreme" });
  const moderateAdv = createMockAdvisory({ severity: "moderate" });
  const infoAdv = createMockAdvisory({ severity: "info" });

  assert.equal(isSevereAdvisory(severeAdv), true, "severe must qualify as severe");
  assert.equal(isSevereAdvisory(extremeAdv), true, "extreme must qualify as severe");
  assert.equal(isSevereAdvisory(moderateAdv), false, "moderate must not qualify as severe");
  assert.equal(isSevereAdvisory(infoAdv), false, "info must not qualify as severe");
  assert.equal(isSevereAdvisory(null as any), false, "null must return false");
});

test("Notification Service - B. Alert key generation and normalization", () => {
  const adv1 = createMockAdvisory({ id: "heat-99", severity: "severe", type: "heat" });
  const key1 = getAdvisoryAlertKey(adv1, "Tokyo");
  const key2 = getAdvisoryAlertKey(adv1, "tokyo");

  assert.equal(key1, key2, "Location names should be case-insensitively normalized");
  assert.match(key1, /tokyo:heat-99:severe:heat/);
});

test("Notification Service - C. Environment without Notification API support", () => {
  // In Node environment without window.Notification
  const originalWindow = (global as any).window;
  try {
    delete (global as any).window;
    assert.equal(isNotificationSupported(), false);
    assert.equal(getNotificationPermission(), "unsupported");
    assert.equal(triggerSevereAdvisoryNotification(createMockAdvisory()), null);
  } finally {
    (global as any).window = originalWindow;
  }
});

test("Notification Service - D. Process advisories with mocked Notification API", async () => {
  const createdNotifications: any[] = [];

  class MockNotification {
    static permission: NotificationPermission = "granted";
    static async requestPermission(): Promise<NotificationPermission> {
      return MockNotification.permission;
    }

    title: string;
    options: any;
    onclick: any = null;

    constructor(title: string, options: any) {
      this.title = title;
      this.options = options;
      createdNotifications.push({ title, options });
    }

    close() {}
  }

  const originalWindow = (global as any).window;
  const originalNotification = (global as any).Notification;

  try {
    (global as any).window = {
      Notification: MockNotification,
      focus: () => {},
    };
    (global as any).Notification = MockNotification;

    clearNotifiedAlerts();

    const advisories: WeatherAdvisory[] = [
      createMockAdvisory({ id: "adv-1", severity: "severe", title: "Flash Flood Warning" }),
      createMockAdvisory({ id: "adv-2", severity: "moderate", title: "Moderate Breeze" }),
      createMockAdvisory({ id: "adv-3", severity: "extreme", title: "Cyclone Alert" }),
    ];

    const result = await processSevereAdvisories(advisories, "Miami", false);

    assert.equal(result.totalAdvisories, 3);
    assert.equal(result.severeCount, 2, "Only severe and extreme should be counted as severe");
    assert.equal(result.triggeredCount, 2, "Both severe advisories should trigger notifications");
    assert.equal(createdNotifications.length, 2);

    assert.match(createdNotifications[0].title, /SEVERE ADVISORY: Flash Flood Warning/);
    assert.match(createdNotifications[1].title, /EXTREME ALERT: Cyclone Alert/);

    // Test deduplication on second run with identical advisories
    const repeatResult = await processSevereAdvisories(advisories, "Miami", false);
    assert.equal(repeatResult.triggeredCount, 0, "Deduplication must prevent repeat alerts for same advisories");
    assert.equal(createdNotifications.length, 2, "No new notifications should be created on repeat");

    // Test new advisory for different location or different ID
    const newAdvisory = [createMockAdvisory({ id: "adv-4", severity: "severe", title: "High Surf Warning" })];
    const newResult = await processSevereAdvisories(newAdvisory, "Miami", false);
    assert.equal(newResult.triggeredCount, 1, "New advisory should trigger notification");
    assert.equal(createdNotifications.length, 3);
  } finally {
    (global as any).window = originalWindow;
    (global as any).Notification = originalNotification;
    clearNotifiedAlerts();
  }
});

test("Notification Service - E. Respects denied permission", async () => {
  class DeniedMockNotification {
    static permission: NotificationPermission = "denied";
    static async requestPermission(): Promise<NotificationPermission> {
      return "denied";
    }
  }

  const originalWindow = (global as any).window;
  const originalNotification = (global as any).Notification;

  try {
    (global as any).window = {
      Notification: DeniedMockNotification,
    };
    (global as any).Notification = DeniedMockNotification;

    clearNotifiedAlerts();

    const advisories = [createMockAdvisory({ id: "adv-denied", severity: "extreme" })];
    const result = await processSevereAdvisories(advisories, "London", false);

    assert.equal(result.triggeredCount, 0, "No notifications when permission is denied");
    assert.equal(result.permission, "denied");
  } finally {
    (global as any).window = originalWindow;
    (global as any).Notification = originalNotification;
    clearNotifiedAlerts();
  }
});
