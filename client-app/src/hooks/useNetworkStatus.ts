// BF_CLIENT_BLOCK_v96_LIVE_TEST_FIXES_v1
// navigator.onLine is unreliable across browsers and OS network
// transitions (Mac Wi-Fi flap, VPN connect, captive portal probes,
// service-worker boot). It frequently reports `false` when the
// network is fine, which previously triggered a sticky offline
// banner AND a permanently-disabled submit button.
//
// V1 fix: assume online. The actual submit POST will fail with a
// real network error if the user is genuinely offline; that's a
// better signal than navigator.onLine.
import { useState } from "react";

type NetworkStatusSubscriber = (isOffline: boolean) => void;

const subscribers = new Set<NetworkStatusSubscriber>();

export function getInitialOfflineState() {
  // Always optimistic. See header comment.
  return false;
}

export function subscribeToNetworkStatus(onChange: NetworkStatusSubscriber) {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

export function useNetworkStatus() {
  const [isOffline] = useState(false);
  return { isOffline };
}
