// BF_CLIENT_v888_TEAMS_IN_APP - the in-app Teams meeting screen, against a fake Calling SDK.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => {
  type Fn = (...a: any[]) => void;
  class Emitter { private l = new Map<string, Fn[]>(); on(e: string, f: Fn) { this.l.set(e, [...(this.l.get(e) ?? []), f]); } off() {} emit(e: string, ...a: any[]) { (this.l.get(e) ?? []).forEach((f) => f(...a)); } }
  class FakeCall extends Emitter {
    state = "Connecting"; isMuted = false; remoteParticipants: any[] = []; callEndReason: any = undefined;
    mute = vi.fn(async () => { this.isMuted = true; }); unmute = vi.fn(async () => { this.isMuted = false; });
    startVideo = vi.fn(async (): Promise<void> => undefined); stopVideo = vi.fn(async (): Promise<void> => undefined);
    hangUp = vi.fn(async () => { this.state = "Disconnected"; });
  }
  const state = { call: null as FakeCall | null, joined: [] as any[], agentOptions: null as any, audio: true };
  return { Emitter, FakeCall, state };
});

vi.mock("@azure/communication-common", () => ({ AzureCommunicationTokenCredential: class { constructor(public token: string) {} dispose() {} } }));
vi.mock("@azure/communication-calling", () => ({
  CallClient: class {
    async createCallAgent(_c: unknown, options: unknown) {
      h.state.agentOptions = options;
      return { join: (locator: unknown, opts: unknown) => { h.state.joined.push([locator, opts]); h.state.call = new h.FakeCall(); return h.state.call; }, dispose: async (): Promise<void> => undefined };
    }
    async getDeviceManager() { return { askDevicePermission: async () => ({ audio: h.state.audio, video: true }), getCameras: async () => [{ id: "cam-1", name: "Front camera" }] }; }
    async dispose() {}
  },
  LocalVideoStream: class { constructor(public source: unknown) {} },
  VideoStreamRenderer: class { async createView() { return { target: document.createElement("div") }; } dispose() {} },
}));

import TeamsMeetingCall, { endMessage } from "../TeamsMeetingCall";

const JOIN = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_test%40thread.v2/0";
const ticket = { token: "t", acsUserId: "8:acs:x", displayName: "Sam Example", joinUrl: JOIN };

beforeEach(() => { h.state.call = null; h.state.joined = []; h.state.audio = true; });

describe("the in-app Teams meeting screen", () => {
  it("joins the Teams link with the person's name and camera, shows the lobby, then the meeting", async () => {
    const onEnded = vi.fn();
    render(<TeamsMeetingCall ticket={ticket} onEnded={onEnded} />);
    await waitFor(() => expect(h.state.call).not.toBeNull());
    expect(h.state.agentOptions).toEqual({ displayName: "Sam Example" });
    const [locator, opts] = h.state.joined[0];
    expect(locator).toEqual({ meetingLink: JOIN });
    expect(opts.videoOptions.localVideoStreams).toHaveLength(1);

    act(() => { h.state.call!.state = "InLobby"; h.state.call!.emit("stateChanged"); });
    expect((screen.getByTestId("meeting-status")).textContent).toContain("You're in the lobby");

    act(() => { h.state.call!.state = "Connected"; h.state.call!.emit("stateChanged"); });
    expect((screen.getByTestId("meeting-status")).textContent).toContain("Waiting for others");

    const p = new h.Emitter() as any; p.displayName = "Alex Tester (Boreal Financial)"; p.isMuted = true; p.videoStreams = [];
    act(() => { h.state.call!.remoteParticipants = [p]; h.state.call!.emit("remoteParticipantsUpdated", { added: [p], removed: [] }); });
    expect((screen.getByTestId("meeting-people")).textContent).toContain("Alex Tester (Boreal Financial) (muted)");

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    await waitFor(() => expect(h.state.call!.mute).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Camera off" }));
    await waitFor(() => expect(h.state.call!.stopVideo).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    await waitFor(() => expect(onEnded).toHaveBeenCalled());
    expect(h.state.call!.hangUp).toHaveBeenCalled();
  });

  it("without the microphone it explains how to fix it and does not join", async () => {
    h.state.audio = false;
    render(<TeamsMeetingCall ticket={ticket} onEnded={() => undefined} />);
    expect(await screen.findByText(/We need your microphone/)).toBeTruthy();
    expect(h.state.joined).toHaveLength(0);
  });

  it("says plainly why the meeting ended", () => {
    expect(endMessage(0, 0)).toBe("You've left the meeting.");
    expect(endMessage(487, 5854)).toMatch(/didn't let you in/);
    expect(endMessage(404, 0)).toMatch(/ended or can't be found/);
  });
});
