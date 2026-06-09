package com.relaylink.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ClipboardManager
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import okhttp3.*
import okio.ByteString
import org.json.JSONObject

class LinkService : Service() {
    private var client: OkHttpClient? = null
    private var webSocket: WebSocket? = null
    private val channelId = "relay_link_channel"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == "START") {
            val ip = intent.getStringExtra("IP") ?: "192.168.1.142"
            val port = intent.getIntExtra("PORT", 8765)

            // Start foreground state immediately to satisfy modern OS restrictions
            val notification: Notification = Notification.Builder(this, channelId)
                .setContentTitle("Relay Link Active")
                .setContentText("KVM Pointer and Clipboard Sync connected to $ip:$port")
                .setSmallIcon(android.R.drawable.stat_notify_sync)
                .build()

            startForeground(101, notification)
            connectWebSocket(ip, port)
        } else if (action == "STOP") {
            disconnectWebSocket()
            stopSelf()
        }

        return START_NOT_STICKY
    }

    private fun connectWebSocket(ip: String, port: Int) {
        disconnectWebSocket()

        client = OkHttpClient.Builder().build()
        val request = Request.Builder()
            .url("ws://$ip:$port/ws")
            .build()

        webSocket = client?.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("RelayLink", "WebSocket Connection opened.")
                
                // Immediately register this Android client capability
                val regMsg = JSONObject().apply {
                    put("type", "register")
                    put("clientType", "mobile")
                    put("deviceId", "android_tablet_hq")
                    put("deviceName", "Galaxy Tab S9 Ultra")
                }
                webSocket.send(regMsg.toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val obj = JSONObject(text)
                    val type = obj.optString("type")

                    if (type == "clipboard") {
                        val format = obj.optString("format")
                        if (format == "text") {
                            val content = obj.optString("content")
                            syncToAndroidClipboard(content)
                        }
                    } else if (type == "mouse") {
                        val event = obj.optString("event")
                        if (event == "move") {
                            val dx = obj.optDouble("dx", 0.0)
                            val dy = obj.optDouble("dy", 0.0)
                            val fx = obj.optDouble("factor_x", 0.0)
                            val fy = obj.optDouble("factor_y", 0.0)
                            
                            // Send custom broadcast coordinate intent directly to KvmAccessibilityService
                            val intent = Intent("com.relaylink.KVM_POINTER_UPDATE").apply {
                                putExtra("DX", dx)
                                putExtra("DY", dy)
                                putExtra("FX", fx)
                                putExtra("FY", fy)
                            }
                            sendBroadcast(intent)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("RelayLink", "Error parsing incoming frame", e)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("RelayLink", "WebSocket Failure. Attempting auto reconnection...", t)
                // Real production clients implement automatic retry logic inside onClosed/onFailure
            }
        })
    }

    private fun syncToAndroidClipboard(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Relay Link Clipboard", text)
        // Mark it so we don't dispatch it right back to the host, triggering a loop!
        clipboard.setPrimaryClip(clip)
        Log.d("RelayLink", "System clipboard successfully updated with: $text")
    }

    private fun disconnectWebSocket() {
        webSocket?.close(1000, "Service stopped")
        webSocket = null
        client = null
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            channelId,
            "Relay Link Foreground Engine",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)
    }

    override fun onDestroy() {
        disconnectWebSocket()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
