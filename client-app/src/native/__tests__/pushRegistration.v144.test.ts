import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

describe('BF_CLIENT_PUSH_ACTIONS_v144', () => {
  it('registers against the route the server actually exposes', () => {
    const src = fs.readFileSync(path.join(root, 'src/native/borealRuntime.ts'), 'utf8');
    expect(src).toContain('/api/push/register-token');
    // The bare /register path does not exist on BF-Server and 404'd silently.
    expect(src).not.toMatch(/["'`]\/api\/push\/register["'`]/);
  });

  it('reports a real platform, which is how the server picks APNs or FCM', () => {
    const src = fs.readFileSync(path.join(root, 'src/native/borealRuntime.ts'), 'utf8');
    expect(src).toContain('devicePlatform()');
    expect(src).not.toContain('platform: "capacitor"');
  });

  it('devicePlatform never throws off-device', async () => {
    const { devicePlatform } = await import('../borealRuntime');
    expect(typeof devicePlatform()).toBe('string');
  });

  it('ships the notification categories iOS needs to draw action buttons', () => {
    const swift = fs.readFileSync(path.join(root, 'ios/App/App/PushCategories.swift'), 'utf8');
    expect(swift).toContain('setNotificationCategories');
    for (const id of ['DOCUMENT_REQUEST', 'APPLICATION_UPDATE', 'OFFER_READY', 'GENERIC']) {
      expect(swift).toContain(id);
    }
    for (const action of ['UPLOAD_NOW', 'OPEN_APPLICATION', 'VIEW_OFFER']) {
      expect(swift).toContain(action);
    }
  });

  it('does not register staff-only categories in the applicant app', () => {
    const swift = fs.readFileSync(path.join(root, 'ios/App/App/PushCategories.swift'), 'utf8');
    expect(swift).not.toContain('identifier: "MISSED_CALL"');
    expect(swift).not.toContain('identifier: "TASK_DUE"');
  });

  it('registers categories at launch', () => {
    const delegate = fs.readFileSync(path.join(root, 'ios/App/App/AppDelegate.swift'), 'utf8');
    expect(delegate).toContain('BorealPushCategories.register()');
    expect(delegate.indexOf('BorealPushCategories.register()')).toBeGreaterThan(
      delegate.indexOf('didFinishLaunchingWithOptions'),
    );
  });

  it('compiles the categories into the App target', () => {
    const pbx = fs.readFileSync(path.join(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');
    expect(pbx).toContain('PushCategories.swift in Sources');
  });
});
