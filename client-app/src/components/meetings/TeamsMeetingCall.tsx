// BF_CLIENT_v888_TEAMS_IN_APP - the Teams meeting itself, inside the app, on the Azure Communication
// Services Calling SDK (Teams interop). Loaded lazily, only when someone joins a meeting.
//
// The same screen as the staff portal's (BF-portal src/features/teamsMeetings/TeamsMeetingCall.tsx).
// It uses the Calling SDK directly rather than the @azure/communication-react composites, which add
// an 8 MB chunk (two versions of Fluent UI and a rich-text editor) - too heavy for a phone app. It
// covers what a Boreal meeting needs: the Teams lobby, everyone's video and shared screens, mute,
// camera and leave.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  CallClient, LocalVideoStream, VideoStreamRenderer,
  type Call, type CallAgent, type RemoteParticipant, type RemoteVideoStream,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";

export type CallTicket = { token: string; acsUserId: string; displayName: string; joinUrl: string; subject?: string | null };
type Phase = "starting" | "lobby" | "connected" | "ended" | "error";
type Person = { key: string; name: string; muted: boolean };

/** Plain-English reason a meeting ended for us (codes from the ACS call end reasons). */
export function endMessage(code: number | undefined, subCode: number | undefined): string {
  if (subCode === 5854 || subCode === 5829) return "The organiser didn't let you in from the lobby.";
  if (subCode === 5300 || subCode === 5000) return "You were removed from the meeting.";
  if (code === 0 || code === undefined) return "You've left the meeting.";
  if (code === 403) return "You aren't allowed into this meeting.";
  if (code === 404) return "This meeting has ended or can't be found.";
  return "The meeting connection was lost.";
}

const btn = (on: boolean, danger = false): CSSProperties => ({
  minWidth: 96, padding: "10px 16px", borderRadius: 999, border: 0, cursor: "pointer", fontWeight: 600, fontSize: 14,
  background: danger ? "#c4314b" : on ? "#ffffff" : "#3b3a39", color: danger ? "#fff" : on ? "#11100f" : "#fff",
});

export default function TeamsMeetingCall({ ticket, onEnded }: { ticket: CallTicket; onEnded: () => void }): JSX.Element {
  const [phase, setPhase] = useState<Phase>("starting");
  const [message, setMessage] = useState<string>("");
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const callRef = useRef<Call | null>(null);
  const cameraRef = useRef<LocalVideoStream | null>(null);
  const selfRendererRef = useRef<VideoStreamRenderer | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const selfRef = useRef<HTMLDivElement | null>(null);

  const showSelf = useCallback(async (stream: LocalVideoStream | null) => {
    selfRendererRef.current?.dispose();
    selfRendererRef.current = null;
    if (selfRef.current) selfRef.current.innerHTML = "";
    if (!stream || !selfRef.current) return;
    const r = new VideoStreamRenderer(stream);
    selfRendererRef.current = r;
    const view = await r.createView({ isMirrored: true, scalingMode: "Crop" });
    selfRef.current?.appendChild(view.target);
  }, []);

  useEffect(() => {
    let gone = false;
    let agent: CallAgent | null = null;
    const client = new CallClient();
    const renderers = new Map<RemoteVideoStream, { renderer: VideoStreamRenderer; tile: HTMLElement }>();

    const refreshPeople = (call: Call) => {
      if (gone) return;
      setPeople(call.remoteParticipants.map((p, i) => ({ key: String(i) + ":" + (p.displayName ?? ""), name: p.displayName || "Guest", muted: p.isMuted })));
    };

    const showStream = async (p: RemoteParticipant, s: RemoteVideoStream) => {
      if (renderers.has(s) || !s.isAvailable || !gridRef.current) return;
      const tile = document.createElement("div");
      tile.setAttribute("data-testid", "meeting-tile");
      tile.style.cssText = "position:relative;background:#000;border-radius:10px;overflow:hidden;min-height:160px";
      const label = document.createElement("span");
      label.textContent = (p.displayName || "Guest") + (s.mediaStreamType === "ScreenSharing" ? " (screen)" : "");
      label.style.cssText = "position:absolute;left:8px;bottom:8px;color:#fff;background:rgba(0,0,0,.55);padding:2px 8px;border-radius:6px;font-size:12px;z-index:1";
      const renderer = new VideoStreamRenderer(s);
      renderers.set(s, { renderer, tile });
      try {
        const view = await renderer.createView({ scalingMode: s.mediaStreamType === "ScreenSharing" ? "Fit" : "Crop" });
        if (gone) { renderer.dispose(); return; }
        tile.appendChild(view.target);
        tile.appendChild(label);
        gridRef.current?.appendChild(tile);
      } catch (err) {
        renderers.delete(s);
        renderer.dispose();
        console.warn("[teams-in-app] could not show a video", err);
      }
    };
    const hideStream = (s: RemoteVideoStream) => {
      const r = renderers.get(s);
      if (!r) return;
      r.renderer.dispose();
      r.tile.remove();
      renderers.delete(s);
    };
    const watchStream = (p: RemoteParticipant, s: RemoteVideoStream) => {
      void showStream(p, s);
      s.on("isAvailableChanged", () => { if (s.isAvailable) void showStream(p, s); else hideStream(s); });
    };
    const watchParticipant = (call: Call, p: RemoteParticipant) => {
      p.videoStreams.forEach((s) => watchStream(p, s));
      p.on("videoStreamsUpdated", (e) => { e.added.forEach((s) => watchStream(p, s)); e.removed.forEach(hideStream); });
      p.on("displayNameChanged", () => refreshPeople(call));
      p.on("isMutedChanged", () => refreshPeople(call));
    };

    (async () => {
      try {
        agent = await client.createCallAgent(new AzureCommunicationTokenCredential(ticket.token), { displayName: ticket.displayName });
        const devices = await client.getDeviceManager();
        const access = await devices.askDevicePermission({ audio: true, video: true });
        if (!access.audio) {
          if (!gone) { setPhase("error"); setMessage("We need your microphone to join. Allow it in your settings, then try again."); }
          return;
        }
        const cameras = access.video ? await devices.getCameras() : [];
        const camera = cameras[0] ? new LocalVideoStream(cameras[0]) : null;
        cameraRef.current = camera;
        if (gone) return;
        const call = agent.join({ meetingLink: ticket.joinUrl }, {
          audioOptions: { muted: false },
          ...(camera ? { videoOptions: { localVideoStreams: [camera] } } : {}),
        });
        callRef.current = call;
        setCameraOn(Boolean(camera));
        void showSelf(camera);
        call.on("stateChanged", () => {
          if (gone) return;
          if (call.state === "InLobby") setPhase("lobby");
          else if (call.state === "Connected") setPhase("connected");
          else if (call.state === "Disconnected") {
            setPhase("ended");
            setMessage(endMessage(call.callEndReason?.code, call.callEndReason?.subCode));
          }
        });
        call.on("isMutedChanged", () => { if (!gone) setMuted(call.isMuted); });
        call.on("remoteParticipantsUpdated", (e) => {
          e.added.forEach((p) => watchParticipant(call, p));
          e.removed.forEach((p) => p.videoStreams.forEach(hideStream));
          refreshPeople(call);
        });
        call.remoteParticipants.forEach((p) => watchParticipant(call, p));
        refreshPeople(call);
      } catch (err) {
        console.warn("[teams-in-app] join failed", err);
        if (!gone) { setPhase("error"); setMessage("We couldn't connect to the meeting. Use Open in Teams instead."); }
      }
    })();

    return () => {
      gone = true;
      const call = callRef.current;
      if (call && call.state !== "Disconnected") void call.hangUp().catch((): void => undefined);
      renderers.forEach((r) => r.renderer.dispose());
      renderers.clear();
      selfRendererRef.current?.dispose();
      void agent?.dispose().catch((): void => undefined);
      void client.dispose().catch((): void => undefined);
    };
  }, [ticket.token, ticket.displayName, ticket.joinUrl, showSelf]);

  const toggleMute = async () => {
    const call = callRef.current;
    if (!call) return;
    if (call.isMuted) await call.unmute(); else await call.mute();
    setMuted(call.isMuted);
  };
  const toggleCamera = async () => {
    const call = callRef.current;
    const camera = cameraRef.current;
    if (!call || !camera) return;
    if (cameraOn) { await call.stopVideo(camera); setCameraOn(false); void showSelf(null); }
    else { await call.startVideo(camera); setCameraOn(true); void showSelf(camera); }
  };
  const leave = async () => {
    const call = callRef.current;
    if (call && call.state !== "Disconnected") await call.hangUp().catch((): void => undefined);
    onEnded();
  };

  const status = phase === "starting" ? "Connecting to the meeting..."
    : phase === "lobby" ? "You're in the lobby. Someone in the meeting will let you in soon."
    : phase === "connected" ? (people.length ? "" : "Waiting for others to join...")
    : message;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", color: "#fff" }} data-testid="meeting-room">
      <div style={{ flex: 1, minHeight: 0, position: "relative", padding: 12, overflow: "auto" }}>
        {status ? <p data-testid="meeting-status" style={{ margin: "8px 0 12px", fontSize: 15 }}>{status}</p> : null}
        <div ref={gridRef} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }} />
        {people.length ? (
          <p style={{ marginTop: 12, fontSize: 13, color: "#c8c6c4" }} data-testid="meeting-people">
            In the meeting: {people.map((p) => p.name + (p.muted ? " (muted)" : "")).join(", ")}
          </p>
        ) : null}
        <div ref={selfRef} aria-label="Your video" style={{ position: "absolute", right: 16, bottom: 16, width: 150, height: 110, borderRadius: 10, overflow: "hidden", background: "#000", display: cameraOn ? "block" : "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, padding: "12px 12px 16px", flexWrap: "wrap" }}>
        {phase === "ended" || phase === "error" ? (
          <button type="button" style={btn(true)} onClick={onEnded}>Close</button>
        ) : (
          <>
            <button type="button" style={btn(!muted)} onClick={() => void toggleMute()} aria-pressed={muted} disabled={phase === "starting"}>{muted ? "Unmute" : "Mute"}</button>
            <button type="button" style={btn(cameraOn)} onClick={() => void toggleCamera()} aria-pressed={cameraOn} disabled={phase === "starting" || !cameraRef.current}>{cameraOn ? "Camera off" : "Camera on"}</button>
            <button type="button" style={btn(false, true)} onClick={() => void leave()}>Leave</button>
          </>
        )}
      </div>
    </div>
  );
}
