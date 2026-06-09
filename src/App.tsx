/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Laptop,
  Tablet,
  Clipboard,
  Image as ImageIcon,
  Wifi,
  Settings,
  MousePointer,
  RefreshCw,
  Sliders,
  X,
  Activity,
  CheckCircle,
  QrCode,
  Lock,
  Unlock,
  FileText,
  Layers,
  ChevronRight,
  ShieldCheck,
  Send,
  Trash2,
  Copy,
  Camera,
  CameraOff,
  Eye,
  Maximize2,
  ZoomIn
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { motion, AnimatePresence } from "motion/react";

// Curated stock simulation images for fast copy-pasting
const DEMO_IMAGES = [
  {
    name: "Geometric Accent",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=60",
    gradient: "from-blue-600 via-indigo-600 to-purple-600",
  },
  {
    name: "Emerald Matrix",
    url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=200&auto=format&fit=crop&q=60",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    name: "Crimson Balance",
    url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=200&auto=format&fit=crop&q=60",
    gradient: "from-rose-500 via-orange-500 to-amber-500",
  }
];

interface LogEntry {
  text: string;
  timestamp: string;
  type: "host" | "tablet" | "system" | "error";
}

interface ConnectionClient {
  id: string;
  clientType: string;
  isVerified: boolean;
  deviceName?: string;
}

interface BufferedPayload {
  id: string;
  sender: "tablet" | "mac";
  target: "mac" | "tablet";
  format: "text" | "image";
  content: string;
  timestamp: string;
}

export default function App() {
  // Connection and API State
  const [pairingCode, setPairingCode] = useState<string>("894201");
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [connectionsCount, setConnectionsCount] = useState<number>(0);
  const [activeClients, setActiveClients] = useState<ConnectionClient[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { text: "Relay Link system engine initialized.", timestamp: new Date().toLocaleTimeString(), type: "system" },
    { text: "WebSocket server listening on port 8765", timestamp: new Date().toLocaleTimeString(), type: "system" },
  ]);

  // Configurations
  const [listenPort, setListenPort] = useState<string>("8765");
  const [shareEdge, setShareEdge] = useState<string>("Right");
  const [isKvmEnabled, setIsKvmEnabled] = useState<boolean>(true);
  const [pointerResponsiveness, setPointerResponsiveness] = useState<"smooth" | "instant">("smooth");
  const [globalClipboardSync, setGlobalClipboardSync] = useState<boolean>(true);
  const [bufferedPayloads, setBufferedPayloads] = useState<BufferedPayload[]>([]);
  const [isAndroidImageModalOpen, setIsAndroidImageModalOpen] = useState<boolean>(false);
  const [localIp, setLocalIp] = useState<string>("192.168.1.142");

  // Reference for client list length to play connect sounds
  const prevClientsCount = useRef<number>(0);

  // Flow Pings
  const [macPingCounter, setMacPingCounter] = useState<number>(0);
  const [macPingType, setMacPingType] = useState<"sent" | "received" | null>(null);
  const [tabletPingCounter, setTabletPingCounter] = useState<number>(0);
  const [tabletPingType, setTabletPingType] = useState<"sent" | "received" | null>(null);

  const triggerMacPing = (type: "sent" | "received") => {
    setMacPingType(type);
    setMacPingCounter((prev) => prev + 1);
  };

  const triggerTabletPing = (type: "sent" | "received") => {
    setTabletPingType(type);
    setTabletPingCounter((prev) => prev + 1);
  };

  // macOS Clipboard States
  const [macClipboardText, setMacClipboardText] = useState<string>("https://github.com/relay-link/core");
  const [macClipboardImage, setMacClipboardImage] = useState<string>(""); // Base64 png data
  const [macSelectedDemoImg, setMacSelectedDemoImg] = useState<number>(0);
  const [reconnectProfile, setReconnectProfile] = useState<"aggressive" | "conservative">("aggressive");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [macClipboardHistory, setMacClipboardHistory] = useState<Array<{ text: string; timestamp: string }>>([
    { text: "https://github.com/relay-link/core", timestamp: "12:05:14 AM" },
    { text: "npx @relay-link/cli verify --port 8765", timestamp: "11:54:20 PM" },
    { text: "adb pair 192.168.1.142:8765", timestamp: "11:42:05 PM" },
    { text: "git clone https://github.com/relay-link/core.git", timestamp: "11:30:12 PM" }
  ]);

  const reconnectProfileRef = useRef<"aggressive" | "conservative">("aggressive");
  useEffect(() => {
    reconnectProfileRef.current = reconnectProfile;
  }, [reconnectProfile]);

  const globalClipboardSyncRef = useRef<boolean>(true);
  useEffect(() => {
    globalClipboardSyncRef.current = globalClipboardSync;
  }, [globalClipboardSync]);

  const addToMacHistory = (text: string) => {
    if (!text || text.trim() === "") return;
    setMacClipboardHistory((prev) => {
      if (prev.length > 0 && prev[0].text === text) return prev;
      const filtered = prev.filter((item) => item.text !== text);
      const newEntry = {
        text,
        timestamp: new Date().toLocaleTimeString(),
      };
      return [newEntry, ...filtered].slice(0, 10);
    });
  };

  // Android Tablet Simulation State
  const [androidIp, setAndroidIp] = useState<string>("192.168.1.142");
  const [androidPort, setAndroidPort] = useState<string>("8765");
  const [androidPairingInput, setAndroidPairingInput] = useState<string>("");
  const [isAndroidConnected, setIsAndroidConnected] = useState<boolean>(false);
  const [isAndroidVerified, setIsAndroidVerified] = useState<boolean>(false);
  const [androidClipboardText, setAndroidClipboardText] = useState<string>("Copied code snippet from Android S9 tablet.");
  const [androidClipboardImage, setAndroidClipboardImage] = useState<string>("");
  const [accessibilityHook, setAccessibilityHook] = useState<boolean>(true);

  // QR Code & Camera Scanning States
  const [pairingQrUrl, setPairingQrUrl] = useState<string>("");
  const [isCameraScanning, setIsCameraScanning] = useState<boolean>(false);
  const [cameraScanError, setCameraScanError] = useState<string>("");

  useEffect(() => {
    if (pairingCode) {
      QRCode.toDataURL(pairingCode, { margin: 1, width: 256 })
        .then((url) => setPairingQrUrl(url))
        .catch((err) => {
          console.error("QR Code rendering error", err);
        });
    }
  }, [pairingCode]);

  // Visual Multi-pointer simulated sharing coordinates
  const [isPointerShared, setIsPointerShared] = useState<boolean>(false);
  const [tabletPointerX, setTabletPointerX] = useState<number>(100);
  const [tabletPointerY, setTabletPointerY] = useState<number>(100);
  const [tabletPointerDx, setTabletPointerDx] = useState<number>(0);
  const [tabletPointerDy, setTabletPointerDy] = useState<number>(0);

  // Drag and Drop files upload refs
  const macFileRef = useRef<HTMLInputElement>(null);
  const androidFileRef = useRef<HTMLInputElement>(null);

  // KVM simulation elements
  const kvmMovementPadRef = useRef<HTMLDivElement>(null);
  const isDraggingPointer = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Web socket reference
  const wsRef = useRef<WebSocket | null>(null);

  // Camera & Scanning reference elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerLoopRef = useRef<number | null>(null);

  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (err) {
      console.error("Audio beep exception:", err);
    }
  };

  const playConnectBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
      gain2.gain.setValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.22);
    } catch (err) {
      console.error("Connect beep error:", err);
    }
  };

  const playPairSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.06); // A5
      gain2.gain.setValueAtTime(0.08, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.22);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1174.66, now + 0.12); // D6
      gain3.gain.setValueAtTime(0.08, now + 0.12);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.12);
      osc3.stop(now + 0.35);
    } catch (err) {
      console.error("Pair success beep error:", err);
    }
  };

  const bufferClipboardPayload = (payload: BufferedPayload) => {
    setBufferedPayloads((prev) => [...prev, payload]);
    addLog(`Buffered ${payload.format} payload from ${payload.sender === "tablet" ? "Tablet" : "Mac"} in queue`, payload.target === "mac" ? "host" : "tablet");
  };

  const applyBufferedPayload = (payload: BufferedPayload) => {
    if (payload.target === "mac") {
      if (payload.format === "text") {
        setMacClipboardText(payload.content);
        addToMacHistory(payload.content);
        addLog(`Applied text: "${payload.content}" to Mac clipboard`, "host");
        triggerMacPing("received");
      } else {
        setMacClipboardImage(payload.content);
        addLog(`Applied screenshot image to Mac clipboard`, "host");
        triggerMacPing("received");
      }
    } else {
      if (payload.format === "text") {
         setAndroidClipboardText(payload.content);
         addLog(`Applied text: "${payload.content}" to Android clipboard`, "tablet");
         triggerTabletPing("received");
      } else {
         setAndroidClipboardImage(payload.content);
         addLog(`Applied asset image to Android clipboard`, "tablet");
         triggerTabletPing("received");
      }
    }
    setBufferedPayloads((prev) => prev.filter((p) => p.id !== payload.id));
  };

  const applyAllBufferedPayloads = () => {
    bufferedPayloads.forEach((payload) => {
      if (payload.target === "mac") {
        if (payload.format === "text") {
          setMacClipboardText(payload.content);
          addToMacHistory(payload.content);
          triggerMacPing("received");
        } else {
          setMacClipboardImage(payload.content);
          triggerMacPing("received");
        }
      } else {
        if (payload.format === "text") {
          setAndroidClipboardText(payload.content);
          triggerTabletPing("received");
        } else {
          setAndroidClipboardImage(payload.content);
          triggerTabletPing("received");
        }
      }
    });
    addLog(`Manually released all (${bufferedPayloads.length}) buffered clipboard items!`, "system");
    setBufferedPayloads([]);
  };

  const discardBufferedPayload = (id: string) => {
    setBufferedPayloads((prev) => prev.filter((p) => p.id !== id));
    addLog("Discarded buffered payload", "system");
  };

  useEffect(() => {
    if (!isCameraScanning) {
      if (scannerLoopRef.current) {
        cancelAnimationFrame(scannerLoopRef.current);
        scannerLoopRef.current = null;
      }
      return;
    }

    setCameraScanError("");
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch(playErr => {
            console.error("Webcam playback error:", playErr);
          });
          scannerLoopRef.current = requestAnimationFrame(scanTick);
        }
      } catch (err: any) {
        console.error("Webcam access error:", err);
        setCameraScanError("Camera access denied or device webcam is currently unavailable.");
        addLog("Tablet camera init failure: permission denied or blocked.", "error");
      }
    };

    const canvas = document.createElement("canvas");
    const scanTick = () => {
      const video = videoRef.current;
      if (!video) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const width = video.videoWidth || 320;
        const height = video.videoHeight || 240;
        canvas.width = Math.min(width, 320);
        canvas.height = Math.min(height, 240);
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          try {
            const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: "dontInvert"
            });
            if (decoded && decoded.data) {
              const scannedText = decoded.data.trim();
              if (/^\d{6}$/.test(scannedText)) {
                playSuccessBeep();
                setAndroidPairingInput(scannedText);
                setIsCameraScanning(false);
                addLog(`QR Decoded: verified 6-digit interlock key: [${scannedText}]`, "tablet");
                
                // Trigger auto pair
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: "register",
                    clientType: "sim-mobile",
                    deviceName: "Tab S8 Ultra",
                    pairingCode: scannedText,
                  }));
                }
                return;
              }
            }
          } catch (qrExc) {
            console.error("QR match exception:", qrExc);
          }
        }
      }

      if (isCameraScanning) {
        scannerLoopRef.current = requestAnimationFrame(scanTick);
      }
    };

    startCamera();

    return () => {
      if (scannerLoopRef.current) {
        cancelAnimationFrame(scannerLoopRef.current);
        scannerLoopRef.current = null;
      }
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraScanning]);

  // 1. Fetch backend state periodically
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.pairingCode);
        setLocalIp(data.mainIp);
        setConnectionsCount(data.connectionsCount);
        setActiveClients(data.activeClients || []);
        setIsServerOnline(true);
      }
    } catch (e) {
      console.warn("Backend API status error:", e);
      setIsServerOnline(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. Initialize Websocket Connection for coordination
  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        addLog("WebSocket socket client pipeline connected.", "system");
        // Register this browser node as desktop-host simulation control
        ws.send(JSON.stringify({
          type: "register",
          clientType: "sim-desktop",
          deviceName: "macOS Simulator Core",
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "sys-update") {
            if (msg.pairingCode) {
              setPairingCode(msg.pairingCode);
            }
            if (msg.clients) {
              setActiveClients(msg.clients);
              setConnectionsCount(msg.activeConnections || msg.clients.length);
              
              if (msg.clients.length > prevClientsCount.current && prevClientsCount.current > 0) {
                playConnectBeep();
              }
              prevClientsCount.current = msg.clients.length;

              // Check if our Android tablet is verified
              const mobileNode = msg.clients.find((c: any) => c.clientType === "sim-mobile" || c.clientType === "mobile");
              if (mobileNode) {
                setIsAndroidConnected(true);
                setIsAndroidVerified(mobileNode.isVerified);
              } else {
                setIsAndroidConnected(false);
                setIsAndroidVerified(false);
              }
            }
          }

          if (msg.type === "pair-success") {
            setIsAndroidVerified(true);
            addLog("Android tablet verified & paired successfully!", "tablet");
            playPairSuccessBeep();
          }

          if (msg.type === "pair-failure") {
            addLog(`Pairing failed: ${msg.message}`, "error");
          }

          if (msg.type === "clipboard") {
            if (msg.format === "text") {
              // Write to appropriate simulated clipboards
              if (msg.sender === "tablet") {
                if (globalClipboardSyncRef.current) {
                  setMacClipboardText(msg.content);
                  addToMacHistory(msg.content);
                  addLog(`Received copied text from Android Tablet: "${msg.content}"`, "host");
                  triggerMacPing("received");
                } else {
                  bufferClipboardPayload({
                    id: Math.random().toString(36).substring(2, 9),
                    sender: "tablet",
                    target: "mac",
                    format: "text",
                    content: msg.content,
                    timestamp: new Date().toLocaleTimeString(),
                  });
                }
              } else {
                if (globalClipboardSyncRef.current) {
                  setAndroidClipboardText(msg.content);
                  addLog(`Received copied text from macOS Host: "${msg.content}"`, "tablet");
                  triggerTabletPing("received");
                } else {
                  bufferClipboardPayload({
                    id: Math.random().toString(36).substring(2, 9),
                    sender: "mac",
                    target: "tablet",
                    format: "text",
                    content: msg.content,
                    timestamp: new Date().toLocaleTimeString(),
                  });
                }
              }
            } else if (msg.format === "image") {
              if (msg.sender === "tablet") {
                if (globalClipboardSyncRef.current) {
                  setMacClipboardImage(msg.content);
                  addLog(`Received screenshot buffer (base64 PNG) from Android Clipboard`, "host");
                  triggerMacPing("received");
                } else {
                  bufferClipboardPayload({
                    id: Math.random().toString(36).substring(2, 9),
                    sender: "tablet",
                    target: "mac",
                    format: "image",
                    content: msg.content,
                    timestamp: new Date().toLocaleTimeString(),
                  });
                }
              } else {
                if (globalClipboardSyncRef.current) {
                  setAndroidClipboardImage(msg.content);
                  addLog(`Received asset render (base64 PNG) from macOS Clipboard`, "tablet");
                  triggerTabletPing("received");
                } else {
                  bufferClipboardPayload({
                    id: Math.random().toString(36).substring(2, 9),
                    sender: "mac",
                    target: "tablet",
                    format: "image",
                    content: msg.content,
                    timestamp: new Date().toLocaleTimeString(),
                  });
                }
              }
            }
          }

          if (msg.type === "mouse") {
            if (msg.event === "move") {
              // Offset current simulated tablet pointer coordinates
              setTabletPointerX((prev) => {
                const next = prev + (msg.dx * 1.5);
                return Math.max(0, Math.min(320, next)); // bound inside mobile tablet viewport
              });
              setTabletPointerY((prev) => {
                const next = prev + (msg.dy * 1.5);
                return Math.max(0, Math.min(480, next));
              });
              setTabletPointerDx(msg.dx);
              setTabletPointerDy(msg.dy);
            }
          }

          if (msg.type === "kvm-status") {
            setIsPointerShared(msg.active);
            if (msg.active) {
              addLog(`pointer crossed ${msg.edge} edge into tablet display overlay.`, "system");
            } else {
              addLog("pointer exited tablet screen, returned to macOS primary host.", "system");
            }
          }

        } catch (e) {
          console.error("WS parse error", e);
        }
      };

      ws.onclose = () => {
        const profile = reconnectProfileRef.current;
        const delay = profile === "aggressive" ? 1000 : 8000;
        addLog(`WebSocket connection dropped. Reconnecting in ${delay / 1000}s [profile: ${profile}]...`, "error");
        setTimeout(connectWebSocket, delay);
      };

    } catch (err) {
      console.error("WS build error", err);
    }
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const addLog = (message: string, type: "host" | "tablet" | "system" | "error") => {
    setLogs((prev) => [
      { text: message, timestamp: new Date().toLocaleTimeString(), type },
      ...prev.slice(0, 48),
    ]);
  };

  // macOS operations
  const handleRegeneratePairingCode = async () => {
    try {
      const res = await fetch("/api/pairing-code/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.pairingCode);
        addLog(`Regenerated pristine pairing security key: ${data.pairingCode}`, "host");
      }
    } catch {
      // client-side fallback
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setPairingCode(randomCode);
      addLog(`Fallback: Generated local security key: ${randomCode}`, "host");
    }
  };

  const handleUpdateMacTextClipboard = (txt: string) => {
    setMacClipboardText(txt);
    addLog(`macOS system copy: "${txt}"`, "host");
    addToMacHistory(txt);
    triggerMacPing("sent");
    
    // Broadcast text
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "clipboard",
        format: "text",
        content: txt,
        sender: "host"
      }));
    }
  };

  const copyDemoImageToMac = (index: number) => {
    setMacSelectedDemoImg(index);
    const demo = DEMO_IMAGES[index];
    
    // Mock Base64 conversion
    // To represent dynamic image, let's create a small visual indicator
    const mockBase64Img = `DEMO_GRADIENT_RGB_BASE64_${demo.name.toUpperCase().replace(/\s/g, "_")}`;
    setMacClipboardImage(mockBase64Img);
    addLog(`macOS Copy Image Buffer: ${demo.name}`, "host");
    triggerMacPing("sent");

    // Send via socket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "clipboard",
        format: "image",
        mime_type: "image/png",
        content: mockBase64Img,
        sender: "host"
      }));
    }
  };

  // Convert uploaded image to Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: "mac" | "android") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      const strippedBase64 = base64Str.split(",")[1] || base64Str;
      
      if (side === "mac") {
        setMacClipboardImage(base64Str);
        addLog(`Copied file ${file.name} to macOS system clipboard. Raw Binary Size: ${(file.size/1024).toFixed(1)}KB`, "host");
        triggerMacPing("sent");
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "clipboard",
            format: "image",
            mime_type: file.type,
            content: base64Str,
            sender: "host"
          }));
        }
      } else {
        setAndroidClipboardImage(base64Str);
        addLog(`Copied tablet photo ${file.name} to Android system clipboard.`, "tablet");
        triggerTabletPing("sent");
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "clipboard",
            format: "image",
            mime_type: file.type,
            content: base64Str,
            sender: "tablet"
          }));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Android Simulator handshakes
  const handleAndroidConnect = () => {
    addLog(`Android tablet attempting WebSocket handshake to http://${androidIp}:${androidPort}/ws`, "tablet");
    
    // Create connection representation by registering connection client
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "register",
        clientType: "sim-mobile",
        deviceName: "Tab S8 Ultra",
        pairingCode: androidPairingInput,
      }));
    }
  };

  const handlePairingValidationCodeSubmit = () => {
    addLog(`Android tablet submitting verification sequence: [${androidPairingInput}]`, "tablet");
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "pair",
        code: androidPairingInput
      }));
    }
  };

  const handleAutoConnectScanCode = () => {
    // Simulates quick camera lens orientation lock & decode over macOS display QR code
    setAndroidPairingInput(pairingCode);
    addLog(`Tablet high-speed scanner locked, decoded Pairing Code: ${pairingCode}`, "tablet");
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Auto register to demonstrate instantaneous pairing handshake
      wsRef.current.send(JSON.stringify({
        type: "register",
        clientType: "sim-mobile",
        deviceName: "Tab S8 Ultra",
        pairingCode: pairingCode,
      }));
    }
  };

  const handleAndroidPushText = (txt: string) => {
    setAndroidClipboardText(txt);
    addLog(`Android clipboard copy: "${txt}"`, "tablet");
    triggerTabletPing("sent");

    if (accessibilityHook && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "clipboard",
        format: "text",
        content: txt,
        sender: "tablet"
      }));
    }
  };

  // Pointer Simulator Pad tracking coordinates
  const handleKvmStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isKvmEnabled) return;
    isDraggingPointer.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setIsPointerShared(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "kvm-status",
        active: true,
        edge: shareEdge,
      }));
    }
  };

  const handleKvmMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingPointer.current || !isKvmEnabled) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "mouse",
        event: "move",
        dx: dx,
        dy: dy,
        timestamp: Date.now()
      }));
    }
  };

  const handleKvmEnd = () => {
    isDraggingPointer.current = false;
    setIsPointerShared(false);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "kvm-status",
        active: false,
        edge: shareEdge,
      }));
    }
  };

  const handleClearHistory = () => {
    setLogs([{ text: "System connection and telemetry history cleared.", timestamp: new Date().toLocaleTimeString(), type: "system" }]);
  };

  return (
    <div id="relay-link-container" className="w-full min-h-screen bg-[#0A0A0C] text-[#E0E1E5] font-sans flex flex-col justify-between overflow-x-hidden">
      
      {/* Header Navigation - Geometric Balance Style */}
      <header id="main-header" className="h-16 border-b border-[#242428] flex items-center justify-between px-6 bg-[#0F0F12]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Layers className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center">
              Relay Link
              <span className="text-blue-500 font-mono text-xs ml-2 opacity-80 font-normal px-1.5 py-0.5 bg-blue-950/40 rounded border border-blue-900/30">
                PRO v1.0.4
              </span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full ${isServerOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-ping" : "bg-red-500"}`}></div>
            <span className="text-xs font-mono text-green-500 uppercase tracking-widest hidden sm:inline-block">
              {isServerOnline ? "System Engine Active" : "Host Offline"}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-[#242428] hidden sm:block"></div>
          <div className="text-right leading-none hidden sm:block">
            <div className="text-[10px] text-[#8E9299] uppercase tracking-wider mb-1">Local IP Host</div>
            <div className="text-sm font-mono font-semibold text-white">{localIp}</div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main id="main-workspace animate-fade-in" className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">
        
        {/* Left Hand Sidebar: Global Configuration & Metrics */}
        <aside id="sidebar-left" className="col-span-1 xl:col-span-3 border-b xl:border-b-0 xl:border-r border-[#242428] bg-[#0C0C0E] p-6 flex flex-col gap-6">
          
          {/* Service Configuration Block */}
          <section className="bg-[#101014] p-4 rounded-xl border border-[#242428] hover:border-slate-800 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-[#8E9299] uppercase tracking-widest">
                Service Configuration
              </h3>
              <Settings className="w-3.5 h-3.5 text-blue-500" />
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-[11px] text-[#8E9299] mb-1.5 block font-medium">Listen Port</label>
                <div className="relative">
                  <input
                    type="text"
                    value={listenPort}
                    onChange={(e) => setListenPort(e.target.value)}
                    className="w-full bg-[#1A1A1E] border border-[#2D2D33] rounded-md px-3 py-2 text-sm font-mono text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  />
                  <div className="absolute right-2 top-2.5 text-[9px] text-[#5E5E66] font-mono">PORT</div>
                </div>
              </div>

              <div className="group">
                <label className="text-[11px] text-[#8E9299] mb-1.5 block font-medium">Auto Switch Screen Edge</label>
                <div className="relative">
                  <select
                    value={shareEdge}
                    onChange={(e) => setShareEdge(e.target.value)}
                    className="w-full bg-[#1A1A1E] border border-[#2D2D33] rounded-md px-3 py-2 text-sm text-white select-custom outline-none appearance-none cursor-pointer focus:border-blue-500"
                  >
                    <option value="Right">Right Edge (Tablet on Right)</option>
                    <option value="Left">Left Edge (Tablet on Left)</option>
                    <option value="Top">Top Edge (Tablet on Top)</option>
                    <option value="Bottom">Bottom Edge (Tablet on Bottom)</option>
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none text-[#8E9299]">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="text-[11px] text-[#8E9299] mb-1.5 block font-medium">Auto-Reconnect Strategy</label>
                <div className="flex bg-[#1A1A1E] border border-[#2D2D33] rounded-md p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReconnectProfile("aggressive");
                      addLog("Reconnection plan adjusted to: AGGRESSIVE (1s retries, minimum latency recovery active)", "system");
                    }}
                    className={`flex-grow text-center py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                      reconnectProfile === "aggressive"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Aggressive
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReconnectProfile("conservative");
                      addLog("Reconnection plan adjusted to: CONSERVATIVE (8s retries, dynamic socket cooling active)", "system");
                    }}
                    className={`flex-grow text-center py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                      reconnectProfile === "conservative"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Conservative
                  </button>
                </div>
              </div>

              <div className="group">
                <label className="text-[11px] text-[#8E9299] mb-1.5 block font-medium">KVM Pointer Responsiveness</label>
                <div className="flex bg-[#1A1A1E] border border-[#2D2D33] rounded-md p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPointerResponsiveness("smooth");
                      addLog("KVM Pointer Responsiveness set to: SMOOTH (spring dynamics active)", "system");
                    }}
                    className={`flex-grow text-center py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                      pointerResponsiveness === "smooth"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Smooth
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPointerResponsiveness("instant");
                      addLog("KVM Pointer Responsiveness set to: INSTANT (near-zero delay mode)", "system");
                    }}
                    className={`flex-grow text-center py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                      pointerResponsiveness === "instant"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-[#8E9299] hover:text-white"
                    }`}
                  >
                    Instant
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[#1C1C22]">
                <div>
                  <span className="text-sm font-medium text-white block">Global Clipboard Sync</span>
                  <span className="text-[10px] text-[#5E5E66]">Auto-apply clipboard updates</span>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !globalClipboardSync;
                    setGlobalClipboardSync(nextVal);
                    addLog(`Global Clipboard Sync set to: ${nextVal ? 'AUTO-APPLY' : 'QUEUE / BUFFER'}`, 'system');
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none focus:ring-1 focus:ring-blue-500 ${globalClipboardSync ? "bg-blue-600" : "bg-[#2D2D33]"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${globalClipboardSync ? "right-1" : "left-1"}`}></span>
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[#1C1C22]">
                <div>
                  <span className="text-sm font-medium text-white block">Pointer Sharing</span>
                  <span className="text-[10px] text-[#5E5E66]">Virtual KVM Active</span>
                </div>
                <button
                  onClick={() => {
                    setIsKvmEnabled(!isKvmEnabled);
                    addLog(`KVM system tracking ${!isKvmEnabled ? 'ENABLED' : 'DISABLED'}`, 'system');
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none focus:ring-1 focus:ring-blue-500 ${isKvmEnabled ? "bg-blue-600" : "bg-[#2D2D33]"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isKvmEnabled ? "right-1" : "left-1"}`}></span>
                </button>
              </div>
            </div>
          </section>

          {/* Secure Pairing Code Generator Frame */}
          <section className="bg-[#101014] p-4 rounded-xl border border-[#242428] hover:border-slate-800 transition-all flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-[#8E9299] uppercase tracking-widest">
                Secure Handshake
              </h3>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>

            <p className="text-xs text-[#8E9299] leading-relaxed mb-4">
              Enter this pairing code into the Android application or scan the real-time generated 2D encrypted matrix to authenticate transport.
            </p>

            {/* Simulated QR Code Card */}
            <div className="bg-[#16161C] border border-[#2d2d38] p-4 rounded-lg flex flex-col items-center justify-center gap-3 relative overflow-hidden">
              <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-blue-500"></div>
              <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t-2 border-r-2 border-blue-500"></div>
              <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-2 border-l-2 border-blue-500"></div>
              <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-2 border-r-2 border-blue-500"></div>
              
              {/* QR Render */}
              <div className="w-28 h-28 bg-white p-2 rounded flex flex-col items-center justify-center relative shadow-inner">
                {pairingQrUrl ? (
                  <img
                    id="macos-qr-code"
                    src={pairingQrUrl}
                    alt="macOS Pairing verification QR code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full animate-pulse bg-slate-200" />
                )}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-1 rounded-sm border border-slate-300 shadow">
                    <Laptop className="w-4 h-4 text-slate-800" />
                  </div>
                </div>
              </div>

              {/* Large Pairing Code text */}
              <div className="flex flex-col items-center bg-[#0C0C0E] w-full py-2 rounded border border-[#222228]">
                <span className="text-[9px] text-[#A3A3AC] uppercase tracking-widest font-mono">Pairing Verification Code</span>
                <span className="text-xl font-mono text-white tracking-widest font-bold mt-1 select-all">{pairingCode}</span>
              </div>

              <button
                onClick={handleRegeneratePairingCode}
                className="w-full bg-[#1A1A1E] hover:bg-slate-800 border border-[#2D2D33] text-xs py-1.5 rounded transition-all flex items-center justify-center gap-1.5 text-[#C0C0C4]"
              >
                <RefreshCw className="w-3 h-3 text-blue-400" />
                Regenerate Code
              </button>
            </div>
          </section>

          {/* System stats block */}
          <section className="bg-[#101014] p-4 rounded-xl border border-[#242428] hover:border-slate-800 transition-all mt-auto">
            <h3 className="text-[11px] font-bold text-[#8E9299] uppercase tracking-widest mb-3">Host Hardware Diagnostics</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0A0A0C] p-2.5 rounded border border-[#242428]">
                <div className="text-[10px] text-[#8E9299] uppercase tracking-tighter">CPU USAGE</div>
                <div className="text-sm font-mono font-bold text-white mt-0.5">1.4%</div>
              </div>
              <div className="bg-[#0A0A0C] p-2.5 rounded border border-[#242428]">
                <div className="text-[10px] text-[#8E9299] uppercase tracking-tighter">LATENCY</div>
                <div className="text-sm font-mono font-bold text-green-400 mt-0.5">~3.5ms</div>
              </div>
            </div>
          </section>

        </aside>

        {/* Center Canvas: Interactive Cross-Device Simulation */}
        <section id="center-sim-space" className="col-span-1 xl:col-span-6 bg-[#09090B] p-6 lg:p-8 flex flex-col justify-between relative">
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(#2D2D33 1.2px, transparent 1.2px)", backgroundColor: "inherit", backgroundSize: "20px 20px" }}></div>
          
          <div className="relative z-10 w-full flex flex-col shrink-0 gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[#E0E1E5] font-semibold text-sm flex items-center gap-2">
                <span className="p-1 px-2 border border-[#242428] bg-yellow-900/10 text-yellow-400 font-mono text-[10px] rounded-full">SIMULATION WORKSPACE</span>
                <span>Active Link Plane</span>
              </h2>
              <span className="text-xs font-mono text-zinc-500">Live WebSockets Interlock</span>
            </div>
            <p className="text-xs text-zinc-400">
              Drag the physical cursor to the selected edge on macOS to lock screen bounds and dynamically stream pointing vectors to the Android tablet.
            </p>
          </div>

          {/* Device Mockups Container */}
          <div className="my-8 relative z-10 flex flex-col lg:flex-row items-center justify-stretch gap-6 xl:gap-8 w-full max-w-4xl mx-auto">
            
            {/* 1. macOS Display Simulator Box */}
            <div className="flex-1 w-full bg-[#0C0C0E] rounded-xl border border-[#242428] flex flex-col shadow-2xl relative overflow-hidden group">
              
              {/* Fake Window traffic light buttons */}
              <div className="h-10 border-b border-[#242428] bg-[#0F0F12] px-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[11px] font-mono font-medium text-zinc-400 flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-blue-500" />
                  macOS Catalina-Host (M2 Core)
                </span>
                <div className="w-4"></div>
              </div>

              {/* Display Core */}
              <div className="p-4 flex-1 flex flex-col justify-between min-h-[300px]">
                
                {/* Active clipboard representation for Mac */}
                <div className="space-y-3">
                  <div className="bg-[#141417] p-3 rounded-lg border border-[#242428] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-blue-400 font-bold uppercase">Mac Screen Clipboard</span>
                      <button
                        type="button"
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="text-[10px] text-blue-400 hover:text-[#5fbaff] flex items-center gap-1.5 bg-blue-950/40 hover:bg-blue-900/30 px-2.5 py-0.5 rounded border border-blue-900/40 transition-all cursor-pointer outline-none"
                      >
                        <Clipboard className="w-3 h-3 text-blue-400" />
                        History ({macClipboardHistory.length})
                      </button>
                    </div>
                    <textarea
                      value={macClipboardText}
                      onChange={(e) => handleUpdateMacTextClipboard(e.target.value)}
                      placeholder="Type text to instantly copy it to all target tablets..."
                      className="w-full min-h-[50px] max-h-[100px] bg-[#1A1A1E] border border-[#2D2D33] rounded px-2.5 py-1.5 text-xs text-white font-mono placeholder-zinc-600 outline-none focus:border-blue-500"
                    />

                    <AnimatePresence>
                      {macPingType && (
                        <motion.div
                          key={`mac-text-ping-pulse-${macPingCounter}`}
                          initial={{ opacity: 0.7, scale: 0.95 }}
                          animate={{ opacity: 0, scale: 1.04 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`absolute inset-0 pointer-events-none rounded-lg border-2 z-20 ${
                            macPingType === "sent" 
                              ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.65)] bg-blue-500/5" 
                              : "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.65)] bg-green-500/5"
                          }`}
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Built-in dynamic photo syncing simulator */}
                  <div className="bg-[#141417] p-3 rounded-lg border border-[#242428] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono text-blue-400 font-bold uppercase">Screen Capture Synchronization Buffer</span>
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                    </div>

                    <AnimatePresence>
                      {macPingType && (
                        <motion.div
                          key={`mac-image-ping-pulse-${macPingCounter}`}
                          initial={{ opacity: 0.7, scale: 0.95 }}
                          animate={{ opacity: 0, scale: 1.04 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`absolute inset-0 pointer-events-none rounded-lg border-2 z-20 ${
                            macPingType === "sent" 
                              ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.65)] bg-blue-500/5" 
                              : "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.65)] bg-green-500/5"
                          }`}
                        />
                      )}
                    </AnimatePresence>
                    
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {DEMO_IMAGES.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => copyDemoImageToMac(i)}
                          className={`h-11 rounded border overflow-hidden relative group/btn cursor-pointer transition-all ${macSelectedDemoImg === i ? "border-blue-500 ring-1 ring-blue-500" : "border-[#2D2D33]"}`}
                        >
                          <img src={img.url} className="w-full h-full object-cover group-hover/btn:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-[8px] font-sans font-medium text-white tracking-widest uppercase">Copy </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Drag and Drop simulator selector */}
                    <div className="border border-dashed border-[#2D2D33] hover:border-blue-500/80 rounded p-2 text-center transition-all bg-[#1D1D24] relative">
                      <input
                        type="file"
                        ref={macFileRef}
                        onChange={(e) => handleImageUpload(e, "mac")}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => macFileRef.current?.click()}
                        className="text-[10px] text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <ImageIcon className="w-3 h-3 text-blue-400" />
                        Upload Custom Screenshot
                      </button>
                    </div>

                    {/* Clipboard visual status thumbnail */}
                    {macClipboardImage && (
                      <div className="mt-2.5 p-2 bg-[#1C1C22] rounded border border-blue-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {macClipboardImage.startsWith("data:") ? (
                            <img src={macClipboardImage} className="w-7 h-7 object-cover rounded border border-[#242428]" />
                          ) : (
                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded border border-[#242428]"></div>
                          )}
                          <div className="leading-none">
                            <span className="text-[10px] text-white block truncate max-w-[130px]">CLIPBOARD_IMAGE.PNG</span>
                            <span className="text-[8px] text-[#4ADE80] uppercase font-mono tracking-tight font-bold">Base64 Encoded Active</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setMacClipboardImage("");
                            addLog("macOS clipboard image cleared.", "host");
                          }}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                  </div>
                </div>

                {/* Virtual Mouse Track Pad */}
                <div className="mt-4">
                  <span className="text-[9px] font-mono text-zinc-500 block mb-1">
                    VIRTUAL KVM TRACKER PIN (MOVE MOUSE HERE TO TRIGGER LOCK)
                  </span>
                  
                  {/* Active lock triggers */}
                  <div
                    ref={kvmMovementPadRef}
                    onMouseDown={handleKvmStart}
                    onMouseMove={handleKvmMove}
                    onMouseUp={handleKvmEnd}
                    onMouseLeave={handleKvmEnd}
                    className="h-20 bg-[#16161D] rounded-lg border border-[#2D2D33] hover:border-slate-700 transition-all cursor-move flex items-center justify-center relative overflow-hidden select-none"
                  >
                    <div className="text-center">
                      <MousePointer className={`w-5 h-5 mx-auto ${isPointerShared ? "text-blue-500 animate-bounce" : "text-zinc-500"}`} />
                      <span className="text-[9px] text-[#8E9299] font-mono block mt-1 tracking-wider uppercase">
                        {isPointerShared ? "LOCK_ACTIVE: REDIRECTING POINTER" : "DRAG CURSOR HERE"}
                      </span>
                    </div>

                    {/* Edge indicators matching chosen edge alignment */}
                    <div className={`absolute w-full h-1 bg-blue-500/80 bottom-0 left-0 transition-opacity ${shareEdge === "Bottom" ? "opacity-100" : "opacity-15"}`} />
                    <div className={`absolute w-full h-1 bg-blue-500/80 top-0 left-0 transition-opacity ${shareEdge === "Top" ? "opacity-100" : "opacity-15"}`} />
                    <div className={`absolute w-1 h-full bg-blue-500/80 left-0 top-0 transition-opacity ${shareEdge === "Left" ? "opacity-100" : "opacity-15"}`} />
                    <div className={`absolute w-1 h-full bg-blue-500/80 right-0 top-0 transition-opacity ${shareEdge === "Right" ? "opacity-100" : "opacity-15"}`} />
                  </div>
                </div>

              </div>

            </div>

            {/* Dynamic Link Arrow indicators */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <div className={`w-8 h-1 rounded ${isPointerShared ? "bg-gradient-to-r from-blue-500 to-green-500 animate-pulse" : "bg-[#2D2D33]"}`}></div>
                <ChevronRight className={`w-4 h-4 ${isPointerShared ? "text-green-400 rotate-0 animate-bounce" : "text-[#5E5E66]"}`} />
              </div>
              <span className="text-[9px] text-zinc-500 font-mono tracking-tighter">802.11ac</span>
            </div>

            {/* 2. Android Tablet Display Simulator box */}
            <div className="flex-1 w-full bg-[#0C0C0E] rounded-xl border border-[#242428] flex flex-col shadow-2xl relative overflow-hidden">
              
              {/* Fake Window bar represent Android tablet bezel */}
              <div className="h-10 border-b border-[#242428] bg-[#0E0E12] px-4 flex items-center justify-between">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> {/* tablet camera lens */}
                <span className="text-[11px] font-mono font-medium text-zinc-400 flex items-center gap-1">
                  <Tablet className="w-3.5 h-3.5 text-[#4ADE80]" />
                  Android 14 (Tab S8 Ultra Bezels)
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-transparent"></div>
              </div>

              {/* Tablet Content Screen */}
              <div className="p-4 flex-grow flex flex-col justify-between min-h-[300px] relative">
                
                {/* Virtual Mouse Pointer overlay with smooth spring animation & border entry dynamics */}
                <AnimatePresence>
                  {isPointerShared && isAndroidVerified && (
                    <motion.div
                      initial={{
                        x: shareEdge === "Left" ? 340 : shareEdge === "Top" ? tabletPointerX : shareEdge === "Bottom" ? tabletPointerX : -20,
                        y: shareEdge === "Left" ? tabletPointerY : shareEdge === "Top" ? 500 : shareEdge === "Bottom" ? -25 : tabletPointerY,
                        opacity: 0,
                        scale: 0.5,
                      }}
                      animate={{
                        x: tabletPointerX,
                        y: tabletPointerY,
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{
                        x: shareEdge === "Left" ? 340 : shareEdge === "Top" ? tabletPointerX : shareEdge === "Bottom" ? tabletPointerX : -20,
                        y: shareEdge === "Left" ? tabletPointerY : shareEdge === "Top" ? 500 : shareEdge === "Bottom" ? -25 : tabletPointerY,
                        opacity: 0,
                        scale: 0.5,
                      }}
                      transition={
                        pointerResponsiveness === "instant"
                          ? { type: "tween", duration: 0 }
                          : {
                              type: "spring",
                              stiffness: 140,
                              damping: 18,
                              mass: 0.65,
                            }
                      }
                      className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 bg-blue-400/25 rounded-full border border-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.7)] z-50 pointer-events-none"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                      <div className="absolute w-12 h-12 rounded-full border border-dashed border-blue-400/15 animate-spin pointer-events-none" style={{ animationDuration: "10s" }}></div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* If Not Connected & Linked state: Authenticate and Pair overlay screen */}
                {!isAndroidVerified ? (
                  isCameraScanning ? (
                    <div className="flex-grow flex flex-col items-center justify-between p-4 bg-[#0A0A0C] rounded-lg border border-green-500/20 absolute inset-4 z-40 overflow-hidden">
                      <div className="w-full text-center shrink-0">
                        <span className="text-[11px] font-bold font-mono tracking-widest text-[#4ADE80] uppercase flex items-center justify-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5 text-[#4ADE80] animate-pulse" />
                          Encrypted QR Scanner
                        </span>
                        <p className="text-[9px] text-[#A3A3AC] mt-1">
                          Align camera with macOS Screen QR code
                        </p>
                      </div>

                      {/* Video Scan frame box with scanner line */}
                      <div className="w-full h-40 max-h-[160px] bg-black rounded-lg overflow-hidden relative border border-[#2D2D33] my-2">
                        {cameraScanError ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-red-950/20">
                            <CameraOff className="w-8 h-8 text-red-500 mb-2" />
                            <span className="text-xs text-red-400 font-semibold mb-1">Camera Feed Error</span>
                            <span className="text-[10px] text-zinc-500 leading-tight">{cameraScanError}</span>
                          </div>
                        ) : (
                          <>
                            <video
                              ref={videoRef}
                              playsInline
                              muted
                              className="w-full h-full object-cover"
                            />
                            {/* Scanning overlay bracket markers */}
                            <div className="absolute inset-6 border border-[#4ADE80]/35 rounded flex flex-col justify-between pointer-events-none">
                              {/* Glowing sweep line */}
                              <div className="absolute left-0 w-full h-[2px] bg-[#4ADE80] animate-scan-laser shadow-[0_0_8px_rgba(74,222,128,0.8)] pointer-events-none" />

                              {/* Corner Brackets */}
                              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#4ADE80]"></div>
                              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#4ADE80]"></div>
                              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#4ADE80]"></div>
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#4ADE80]"></div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Scanner Control Row */}
                      <div className="w-full grid grid-cols-2 gap-2 mt-1 select-none shrink-0">
                        <button
                          type="button"
                          onClick={handleAutoConnectScanCode}
                          className="bg-[#1A1A1E] hover:bg-zinc-800 border border-zinc-700 text-[10px] py-1 rounded transition-all font-mono text-zinc-400 cursor-pointer"
                        >
                          Simulator Bypass
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCameraScanning(false)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-[10px] text-white py-1 rounded transition-all font-semibold cursor-pointer"
                        >
                          Cancel Scan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center p-3 text-center bg-[#101015]/95 rounded-lg border border-yellow-900/30 absolute inset-4 z-40">
                      <Lock className="w-8 h-8 text-yellow-500 mb-3 animate-bounce" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-500 mb-2">
                        Secure Interlock Verification Key Required
                      </h4>
                      
                      <p className="text-[11px] text-zinc-400 max-w-[220px] mx-auto leading-relaxed mb-4">
                        Tablet must match the host's 6-digit cryptographic identity to allow Virtual KVM control & clipboard synchronization.
                      </p>

                      <div className="space-y-3 w-full max-w-[200px]">
                        <div className="flex gap-1 justify-center">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Code (e.g. 894212)"
                            value={androidPairingInput}
                            onChange={(e) => setAndroidPairingInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-[#1A1A1E] border border-zinc-700 rounded px-2.5 py-1 text-center font-mono text-sm uppercase tracking-widest text-white outline-none focus:border-yellow-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsCameraScanning(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-[10px] py-1.5 rounded transition-all font-mono font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-white animate-pulse" />
                            Scan QR Code
                          </button>
                          <button
                            type="button"
                            onClick={handlePairingValidationCodeSubmit}
                            className="bg-yellow-600 hover:bg-yellow-500 text-xs text-white py-1.5 rounded font-semibold transition-all shadow shadow-yellow-900/40 cursor-pointer"
                          >
                            Verify Match
                          </button>
                        </div>

                      </div>
                    </div>
                  )
                ) : (
                  // Verified State Overlay Indicators
                  <div className="absolute top-2 right-2 bg-green-950/40 border border-green-800/30 px-2 py-0.5 rounded flex items-center gap-1.5 z-30">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></div>
                    <span className="text-[8px] font-mono font-bold text-green-400 tracking-wider">PAIRING_SECURE</span>
                  </div>
                )}

                {/* Android interactive states */}
                <div className="space-y-3">
                  
                  {/* Simulated Tablet Clipboard */}
                  <div className="bg-[#141417] p-3 rounded-lg border border-[#242428] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-[#4ADE80] font-bold uppercase">Tablet Local Clipboard</span>
                      <Clipboard className="w-3.5 h-3.5 text-[#4ADE80]" />
                    </div>
                    <textarea
                      value={androidClipboardText}
                      onChange={(e) => handleAndroidPushText(e.target.value)}
                      placeholder="Type text on tablet clipboard..."
                      className="w-full min-h-[50px] max-h-[100px] bg-[#1A1A1E] border border-[#2D2D33] rounded px-2.5 py-1.5 text-xs text-white font-mono placeholder-zinc-600 outline-none focus:border-green-500"
                    />
                    
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#1C1C22]">
                      <span className="text-[10px] text-zinc-400">Accessibility Auto Push Clipboard</span>
                      <button
                        onClick={() => {
                          setAccessibilityHook(!accessibilityHook);
                          addLog(`Android clipboard auto-push set to ${!accessibilityHook ? "ON" : "OFF"}`, "tablet");
                        }}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${accessibilityHook ? "bg-green-950/40 border-green-800/30 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}
                      >
                        {accessibilityHook ? "HOOKED" : "DISABLED"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {tabletPingType && (
                        <motion.div
                          key={`tablet-text-ping-pulse-${tabletPingCounter}`}
                          initial={{ opacity: 0.7, scale: 0.95 }}
                          animate={{ opacity: 0, scale: 1.04 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`absolute inset-0 pointer-events-none rounded-lg border-2 z-25 ${
                            tabletPingType === "sent" 
                              ? "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.65)] bg-green-500/5" 
                              : "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.65)] bg-blue-500/5"
                          }`}
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Tablet Image clipboard viewer & sender */}
                  <div className="bg-[#141417] p-3 rounded-lg border border-[#242428] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono text-[#4ADE80] font-bold uppercase">Tablet Screen Image Storage</span>
                      <ImageIcon className="w-3.5 h-3.5 text-[#4ADE80]" />
                    </div>

                    <AnimatePresence>
                      {tabletPingType && (
                        <motion.div
                          key={`tablet-image-ping-pulse-${tabletPingCounter}`}
                          initial={{ opacity: 0.7, scale: 0.95 }}
                          animate={{ opacity: 0, scale: 1.04 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`absolute inset-0 pointer-events-none rounded-lg border-2 z-25 ${
                            tabletPingType === "sent" 
                              ? "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.65)] bg-green-500/5" 
                              : "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.65)] bg-blue-500/5"
                          }`}
                        />
                      )}
                    </AnimatePresence>

                    <div className="border border-dashed border-[#2D2D33] hover:border-[#4ADE80] rounded p-2 text-center transition-all bg-[#1D1D24] relative">
                      <input
                        type="file"
                        ref={androidFileRef}
                        onChange={(e) => handleImageUpload(e, "android")}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => androidFileRef.current?.click()}
                        className="text-[10px] text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <ImageIcon className="w-3 h-3 text-[#4ADE80]" />
                        Sync Camera Capture to Mac
                      </button>
                    </div>

                     {/* Rendering the active synced image from macOS clipboard */}
                    {androidClipboardImage && (
                      <div className="mt-3 p-2 bg-[#1C1C22] rounded border border-green-900/40">
                        <span className="text-[9px] font-mono text-zinc-400 block mb-1">CURRENTLY DECODED CLIPPED OBJECT</span>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {androidClipboardImage.startsWith("data:") ? (
                              <div
                                onClick={() => setIsAndroidImageModalOpen(true)}
                                className="relative group/thumb cursor-pointer overflow-hidden rounded border border-[#242428] shrink-0 w-14 h-11"
                                title="Click to view full size"
                              >
                                <img src={androidClipboardImage} className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105" />
                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-14 h-11 bg-gradient-to-br from-green-500 to-teal-600 rounded border border-[#242428] shrink-0" />
                            )}
                            <div className="leading-none">
                              <span className="text-[10px] text-white block font-medium">DEC_SCREEN_BUFF.PNG</span>
                              <span className="text-[8px] text-zinc-500 mt-1 block">MimeType: image/png</span>
                            </div>
                          </div>

                          {androidClipboardImage.startsWith("data:") && (
                            <button
                              type="button"
                              onClick={() => setIsAndroidImageModalOpen(true)}
                              className="text-[10px] text-green-400 hover:text-green-300 bg-green-950/30 hover:bg-green-950/60 border border-green-800/30 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0 select-none"
                            >
                              <Maximize2 className="w-3 h-3" />
                              View Full
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                </div>

                {/* Touch Gesture Monitor bar showing coordinates relative movement translation */}
                {isPointerShared && (
                  <div className="mt-4 p-2 bg-blue-950/10 border border-blue-900/30 rounded-lg">
                    <div className="flex items-center justify-between text-[9px] font-mono text-blue-400">
                      <span>GESTURES: TOUCH_INTERMEDIATE</span>
                      <span>X: {Math.round(tabletPointerX)} | Y: {Math.round(tabletPointerY)}</span>
                    </div>
                    {/* Progress tracking movement relative bar */}
                    <div className="w-full bg-slate-800 h-1 rounded overflow-hidden mt-1 bg-zinc-900">
                      <div
                        style={{ width: `${(tabletPointerX / 320) * 100}%` }}
                        className="h-full bg-blue-500 transition-all duration-75"
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* Prompt warning note */}
          <div className="text-center mt-4">
            <p className="text-xs text-[#8E9299]">
              Pointer displacement utilizes relative coordinates standard via WebSocket mapping protocol. Press <span className="px-1 text-white bg-slate-800 rounded">ESC</span> inside simulation space if dragging locks.
            </p>
          </div>

        </section>

        {/* Right Sidebar: Clipboard buffer logs & Peer updates */}
        <aside id="sidebar-right" className="col-span-1 xl:col-span-3 border-t xl:border-t-0 xl:border-l border-[#242428] bg-[#0C0C0E] flex flex-col justify-between">
          
          <div className="p-6 flex-1 flex flex-col overflow-y-auto max-h-[500px] xl:max-h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold text-[#8E9299] uppercase tracking-widest">
                Active Peer Connections ({connectionsCount})
              </h3>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            {/* List Active Sockets Connection Nodes */}
            <div className="space-y-2">
              {activeClients.map((client) => (
                <div
                  key={client.id}
                  className={`border rounded-lg p-3 flex items-center gap-3 transition-colors ${client.isVerified ? "bg-[#1A1A1E]/80 border-green-500/20" : "bg-[#1C1410] border-yellow-500/20"}`}
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${client.isVerified ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-500"}`}>
                    {client.clientType.includes("desktop") ? (
                      <Laptop className="w-4 h-4" />
                    ) : (
                      <Tablet className="w-4 h-4" />
                    )}
                  </div>
                  <div className="leading-tight flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{client.deviceName || "Unspecified Peer"}</div>
                    <div className="text-[9px] font-mono truncate text-zinc-500">
                      {client.clientType === "desktop" || client.clientType === "sim-desktop" ? "Host macOS Core" : "Interactive Tablet"}
                    </div>
                  </div>
                  <div>
                    <span className={`text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border ${client.isVerified ? "bg-green-950/40 border-green-800/30 text-green-400" : "bg-yellow-950/40 border-yellow-800/30 text-yellow-500"}`}>
                      {client.isVerified ? "Verified" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}

              {activeClients.length === 0 && (
                <div className="p-4 border border-dashed border-[#2D2D33] text-center rounded-lg text-zinc-600 text-xs">
                  Awaiting Socket Link up connections...
                </div>
              )}
            </div>

            {/* Buffered Clipboard Payload Queue (Visible when Sync is disabled or has items) */}
            {(!globalClipboardSync || bufferedPayloads.length > 0) && (
              <div className="mt-6 p-4 bg-[#111116] border border-[#24242A] rounded-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500/80"></div>
                <div className="flex items-center justify-between mb-3 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                    <h3 className="text-[11px] font-bold text-yellow-500 uppercase tracking-widest font-mono">
                      Buffered Sync Queue
                    </h3>
                  </div>
                  <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-yellow-500/20">
                    {bufferedPayloads.length} PENDING
                  </span>
                </div>

                <p className="text-[10px] text-zinc-400 pl-2 mb-3 leading-relaxed">
                  Payload auto-application is suspended. Choose which received clipboard items to handoff or release.
                </p>

                {bufferedPayloads.length === 0 ? (
                  <div className="p-3 bg-[#15151A] rounded-lg border border-dashed border-[#2D2D35] text-center text-zinc-500 text-xs font-mono ml-2">
                    Queue empty. Copy items on client devices.
                  </div>
                ) : (
                  <div className="space-y-2 ml-2">
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-custom pr-1">
                      <AnimatePresence initial={false}>
                        {bufferedPayloads.map((payload) => (
                          <motion.div
                            key={payload.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#18181F] border border-[#2D2D35] p-2 rounded-lg flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded ${
                                  payload.sender === "tablet" 
                                    ? "bg-green-950/40 border border-green-800/30 text-green-400" 
                                    : "bg-blue-950/40 border border-blue-800/30 text-blue-400"
                                }`}>
                                  {payload.sender === "tablet" ? "Tablet" : "Mac"}
                                </span>
                                <span className="text-zinc-500 font-mono text-[9px]">➔</span>
                                <span className={`text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded ${
                                  payload.target === "mac" 
                                    ? "bg-blue-950/40 border border-blue-800/30 text-blue-400" 
                                    : "bg-green-950/40 border border-green-800/30 text-green-400"
                                }`}>
                                  {payload.target === "mac" ? "Mac" : "Tablet"}
                                </span>
                              </div>

                              {/* Payload content info */}
                              <div className="flex items-center gap-2">
                                {payload.format === "image" ? (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {payload.content.startsWith("data:") ? (
                                      <img src={payload.content} className="w-6 h-6 object-cover rounded border border-zinc-800 shrink-0" />
                                    ) : (
                                      <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-amber-600 rounded shrink-0" />
                                    )}
                                    <span className="text-[10px] font-mono text-zinc-300 truncate font-medium">SCREEN_RENDER.PNG</span>
                                  </div>
                                ) : (
                                  <p className="text-[10px] font-mono text-zinc-300 truncate bg-[#1D1D26] px-1.5 py-0.5 rounded border border-zinc-800/60 w-full">
                                    {payload.content}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Release / Discard Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => applyBufferedPayload(payload)}
                                className="w-7 h-7 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/50 text-emerald-400 rounded flex items-center justify-center transition-all cursor-pointer"
                                title="Apply to active clipboard"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => discardBufferedPayload(payload.id)}
                                className="w-7 h-7 bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 text-red-400 rounded flex items-center justify-center transition-all cursor-pointer"
                                title="Discard"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Apply all / Clear actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[#23232C] mt-2">
                      <button
                        onClick={applyAllBufferedPayloads}
                        className="flex-grow py-1.5 bg-yellow-500 hover:bg-yellow-400 text-[#09090B] font-semibold text-[10px] rounded transition-all cursor-pointer text-center uppercase tracking-wider font-mono shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                      >
                        Release All ({bufferedPayloads.length})
                      </button>
                      <button
                        onClick={() => {
                          setBufferedPayloads([]);
                          addLog("Cleared all pending buffered clipboard items.", "system");
                        }}
                        className="py-1.5 px-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] rounded border border-zinc-850/80 transition-all cursor-pointer font-mono font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Telemetry log trace */}
            <div className="mt-8 mb-4 border-t border-[#1C1C22] pt-6 flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-[#8E9299] uppercase tracking-widest">
                Real-time System Logs
              </h3>
              <button
                onClick={handleClearHistory}
                className="text-zinc-600 hover:text-white transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Simulated Live logs from WebSocket Events */}
            <div className="flex-1 space-y-2 font-mono scrollbar-custom min-h-[140px] max-h-[220px] xl:max-h-none overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="bg-[#141417]/80 p-2 rounded border border-[#222228] relative text-[10px]"
                >
                  <div className="flex justify-between items-center mb-0.5 text-[8px] text-zinc-600">
                    <span className={`uppercase font-bold tracking-tight ${log.type === "system" ? "text-blue-500" : log.type === "tablet" ? "text-green-400" : log.type === "host" ? "text-indigo-400" : "text-red-400"}`}>
                      {log.type}
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="text-[#C0C0C4] break-all leading-normal">{log.text}</p>
                </div>
              ))}
            </div>

          </div>

          {/* Action Footer Button clear out clipboard cache */}
          <div className="p-4 border-t border-[#242428] bg-[#0F0F12]">
            <button
              onClick={() => {
                setMacClipboardText("");
                setAndroidClipboardText("");
                setMacClipboardImage("");
                setAndroidClipboardImage("");
                addLog("Emulated device clipboard indexes cleared out successfully.", "system");
              }}
              className="w-full bg-[#1A1A1E] hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded border border-[#2D2D33] transition-colors"
            >
              Clear Buffer Cache Memory
            </button>
          </div>

        </aside>

      </main>

      {/* Footer Status Bar matching layout of Geometric Balance */}
      <footer id="main-footer" className="h-8 bg-[#0F0F12] border-t border-[#242428] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4 text-[9px] font-mono text-[#5E5E66]">
          <span>WS_STATUS: <span className="text-[#4ADE80] font-bold">ACTIVE_LISTENING</span></span>
          <span className="hidden sm:inline-block">UPTIME: 12:44:02</span>
          <span className="hidden md:inline-block">BUFFER: JSON_LOW_OVERHEAD</span>
          <span className="hidden lg:inline-block">PING_LATENCY: 4.1ms</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[9px] text-[#8E9299] uppercase tracking-tighter">
            Pointer Interlock Active (DRAG IN BOX TO SHARE POINTER)
          </span>
        </div>
      </footer>

      {/* Clipboard History Modal */}
      {isHistoryModalOpen && (
        <div id="clipboard-history-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div id="clipboard-history-modal" className="bg-[#101014] border border-[#242428] w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="h-12 border-b border-[#242428] bg-[#0F0F12] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-sm text-white">macOS Host Clipboard History</span>
                <span className="text-[10px] font-mono text-[#8E9299] bg-[#1E1E24] px-1.5 py-0.5 rounded border border-[#2E2E38]">
                  Last 10 Snippets
                </span>
              </div>
              <button
                id="close-history-modal"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#1E1E24] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <p className="text-xs text-[#8E9299] leading-relaxed">
                Click any snippet to instantly sync it to macOS Screen Clipboard and broadcast it over local WebSockets to paired Android tablets/devices.
              </p>

              <div className="space-y-2">
                {macClipboardHistory.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs font-mono">
                    No copied clippings available in history.
                  </div>
                ) : (
                  macClipboardHistory.map((item, index) => {
                    const isActive = macClipboardText === item.text;
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          handleUpdateMacTextClipboard(item.text);
                          setIsHistoryModalOpen(false);
                        }}
                        className={`group/item p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                          isActive
                            ? "bg-blue-950/20 border-blue-500/60 shadow-md"
                            : "bg-[#141417] border-[#242428] hover:border-slate-700 hover:bg-[#1C1C22]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span className={`font-mono text-xs break-all select-none line-clamp-2 ${isActive ? "text-blue-400 font-semibold" : "text-white"}`}>
                            {item.text}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono shrink-0 select-none align-middle mt-0.5">
                            {item.timestamp}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-[#8E9299] font-mono">
                            {item.text.length} characters
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            {isActive ? (
                              <span className="text-[9px] font-bold text-green-400 font-mono flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                ACTIVE SYNCED
                              </span>
                            ) : (
                              <span className="text-[9px] text-blue-500 group-hover/item:text-blue-400 font-mono font-bold flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <Send className="w-3 h-3" />
                                CLICK TO RE-SYNC
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="h-12 border-t border-[#242428] bg-[#0D0D11] px-4 flex items-center justify-between">
              <button
                id="clear-history-button"
                onClick={() => {
                  setMacClipboardHistory([]);
                  addLog("macOS clipboard history cleared.", "system");
                }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer outline-none"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
              <button
                id="close-history-modal-footer"
                onClick={() => setIsHistoryModalOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Android received image full size viewer modal */}
      {isAndroidImageModalOpen && androidClipboardImage && (
        <div id="android-image-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-4">
          <div id="android-image-modal" className="bg-[#0C0C0E] border border-green-900/30 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="h-12 border-b border-[#242428] bg-[#0E0E12] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#4ADE80]" />
                <span className="font-semibold text-sm text-white">Android Decoded Clipped Image Preview</span>
                <span className="text-[10px] font-mono text-green-400 bg-green-950/40 px-1.5 py-0.5 rounded border border-green-800/25">
                  Full Size
                </span>
              </div>
              <button
                id="close-android-img-modal"
                onClick={() => setIsAndroidImageModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#1E1E24] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-[#09090B]">
              <div className="relative border border-[#1F1F24] rounded-lg p-2 bg-[#121216] max-w-full shadow-inner flex items-center justify-center">
                <img
                  src={androidClipboardImage}
                  alt="Decoded clipped fullsize workspace content"
                  className="max-h-[60vh] max-w-full rounded object-contain"
                />
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-[#8E9299]">
                  Originating from macOS clipboard buffer via active WebSocket linkage.
                </p>
                <span className="text-[10px] font-mono text-zinc-500 mt-1 block h-4">
                  Buffer string size: {(androidClipboardImage.length / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="h-12 border-t border-[#242428] bg-[#0A0A0D] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <a
                  href={androidClipboardImage}
                  download="dec_screen_buff.png"
                  className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 cursor-pointer outline-none font-medium bg-green-950/20 px-2.5 py-1 rounded border border-green-900/30"
                >
                  Download PNG
                </a>
              </div>
              <button
                id="close-android-img-modal-footer"
                onClick={() => setIsAndroidImageModalOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
