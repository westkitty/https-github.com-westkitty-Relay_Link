# Protocol Specification & API Integration: Relay Link (v1.0.0)

Relay Link is a low-latency, bidirectional Virtual KVM and clipboard synchronization protocol operating over secure local WebSockets. This document provides the engineering-level API specifications, event payload JSON schemas, and technical implementation blueprints.

---

## 1. Network Discovery & Lifecycle Handshake

To enable zero-configuration pairing across the local subnet, clients perform self-discovery using UDP Broadcast / Multicast, followed by an upgrading transition to a TCP WebSocket session.

### 1-A. UDP Beaconing (Service Discovery)
The macOS server broadcasts a JSON beacon on the local subnet at **UDP Port 8764** every **2.0 seconds**:

```json
{
  "service": "relay-link-discovery",
  "version": "1.0.0",
  "host_name": "MacBook Pro",
  "port": 8765,
  "supported_features": ["ClipboardSync", "VirtualKVM"]
}
```

Upon receiving this beacon, the Android client initiates a standard WebSocket handshake with the server's WebSocket endpoint:  
`ws://<mac_ip_address>:<port>/ws`

---

### 1-B. Client Registration Handshake
Once the WebSocket connection is successfully established, the client must transmit a **Registration Frame** within **500 milliseconds**. If no valid registration is received, the server terminates the socket.

#### Registration Request (Client → Server)
```json
{
  "type": "register",
  "clientType": "mobile",
  "deviceId": "tablet_android_tab_s9",
  "deviceName": "Galaxy Tab S9",
  "capabilities": {
    "screen": {
      "width_px": 2560,
      "height_px": 1600,
      "density_dpi": 320
    },
    "supports_gestures": true,
    "clipboard_formats": ["text/plain", "image/png"]
  }
}
```

#### Registration Acknowledgment (Server → Client)
```json
{
  "type": "registered",
  "id": "client_9281a",
  "clientType": "mobile",
  "serverTime": 1718105021234,
  "config": {
    "ping_interval_ms": 15000,
    "kvm_sensitivity": 1.0,
    "selected_edge": "Right"
  }
}
```

---

## 2. Virtual KVM Protocol

Hovering the cursor past the chosen macOS screen boundary locks the Mac's mouse pointer and redirects cursor controls to the Android tablet. This stream operates at **60Hz - 120Hz**, utilizing relative pixel differentials (`dx`, `dy`) and edge proportions to ensure precise touch mapping.

### 2-A. Mouse Pointer Motion Frame
Transmitted at high frequency from Mac to tablet during active sharing:

```json
{
  "type": "mouse",
  "event": "move",
  "dx": -4.5,
  "dy": 12.0,
  "x": 1280,
  "y": 720,
  "factor_x": 0.5000,
  "factor_y": 0.4500,
  "timestamp": 1718105021543
}
```

* **`dx` / `dy`**: Relative offset pointers (float) representing sub-pixel resolution values. Used to feed the Android relative cursor movement.
* **`factor_x` / `factor_y`**: Normalized ratios representing the absolute coordinates on the virtual plane (valued `0.0` to `1.0`). Useful for immediate absolute cursor centering on the Android overlay.

---

### 2-B. Click / Touch Action Frame
Fired whenever native physical mouse buttons are toggled on the Mac, translated into touch events or mouse clicks on Android:

```json
{
  "type": "mouse",
  "event": "click",
  "button": "left",
  "action": "down",
  "timestamp": 1718105021900
}
```
* **`button`**: Represents `"left"`, `"right"`, or `"middle"`.
* **`action`**: Representing `"down"`, `"up"`, or `"click"`. On Android, `"down"` maps to `dispatchGesture` with a dynamic path drag down, and `"up"` invokes a path release.

---

### 2-C. Scroll Motion Wheel Frame
```json
{
  "type": "mouse",
  "event": "scroll",
  "scroll_x": 0,
  "scroll_y": -1.5,
  "timestamp": 1718105021950
}
```
* **`scroll_y`**: Negative values indicate scrolling down vertically; positive values indicate scrolling up. Android maps this to synthetic touch slide sequences or direct generic motion events.

---

## 3. Bidirectional Clipboard API

To avoid synchronization loops, each peer maintains an active transaction ID. Updates are pushed immediately upon native copy event detection.

### 3-A. String Text Sync Payload
```json
{
  "type": "clipboard",
  "format": "text",
  "content": "Hello from macOS! Copied link to cloud console...",
  "timestamp": 1718105025001
}
```

---

### 3-B. Image Sync (Base64 Binary) Payload
For binary objects (such as screenshot captures), payloads are formatted using a clean Base64 schema:

```json
{
  "type": "clipboard",
  "format": "image",
  "mime_type": "image/png",
  "content": "iVBORw0KGgoAAAANSUhEUgAAAAUA...[Base64 String]...YII=",
  "dimensions": {
    "width": 640,
    "height": 480
  },
  "timestamp": 1718105029104
}
```

---

## 4. Latency Mitigation & Connection Resiliency

To enforce sub-15ms processing latency and keep the user experience seamless:

1. **Heartbeat pinging:** The server issues an empty ping frame every 15s. If a client fails to reply within 5s, the session is pruned and resource garbage collection resets KVM bounds.
2. **Immediate Auto-Reconnect Routing:** Client sockets implement an exponential-backoff retry scheme. Reconnect polls are triggered instantly upon receipt of a hard TCP Reset (`RST`), starting with an instantaneous retry interval: `backoff = min(100ms * (1.5 ^ attempts), 10s)`.
3. **Socket Buffering Controls:** The WebSocket TCP socket is configured with the `TCP_NODELAY` flag enabled. This disables Nagle's algorithm, packing coordinate changes into transmission frames immediately.
