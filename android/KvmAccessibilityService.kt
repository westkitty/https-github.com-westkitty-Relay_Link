package com.relaylink.services

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Path
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.ImageView
import com.relaylink.MainActivity

class KvmAccessibilityService : AccessibilityService() {

    private var windowManager: WindowManager? = null
    private var pointerView: View? = null
    private var params: WindowManager.LayoutParams? = null

    // Track virtual floating coordinates on Android Tablet dimensions
    private var currentX = 500f
    private var currentY = 500f
    private var screenWidth = 1920
    private var screenHeight = 1200

    private val pointerReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent?.let {
                val dx = it.getDoubleExtra("DX", 0.0).toFloat()
                val dy = it.getDoubleExtra("DY", 0.0).toFloat()
                val fx = it.getFloatExtra("FX", -1f)
                val fy = it.getFloatExtra("FY", -1f)

                if (fx >= 0 && fy >= 0) {
                    // Absolute alignment mapping:
                    currentX = fx * screenWidth
                    currentY = fy * screenHeight
                } else {
                    // Relative additive mapping:
                    currentX = (currentX + dx).coerceIn(0f, screenWidth.toFloat())
                    currentY = (currentY + dy).coerceIn(0f, screenHeight.toFloat())
                }

                // Smoothly translate floating overlay SVG indicator icon coordinates
                updatePointerPosition()
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // Inflate high-precision mouse cursor indicator
        pointerView = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_compass) // Represents pointer arrow
        }

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.LEFT
            x = currentX.toInt()
            y = currentY.toInt()
        }

        windowManager?.addView(pointerView, params)
        registerReceiver(pointerReceiver, IntentFilter("com.relaylink.KVM_POINTER_UPDATE"), RECEIVER_EXPORTED)
    }

    private fun updatePointerPosition() {
        params?.let {
            it.x = currentX.toInt()
            it.y = currentY.toInt()
            windowManager?.updateViewLayout(pointerView, it)
        }
    }

    // Translate mouse clicks into Android tap input gestures programmatically
    fun dispatchClick(x: Float, y: Float) {
        val clickPath = Path().apply {
            moveTo(x, y)
        }
        val gestureBuilder = GestureDescription.Builder()
        // Create Tap gesture (100ms long path at target coordinates)
        val stroke = GestureDescription.StrokeDescription(clickPath, 0, 100)
        gestureBuilder.addStroke(stroke)
        
        dispatchGesture(gestureBuilder.build(), null, null)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    override fun onDestroy() {
        unregisterReceiver(pointerReceiver)
        pointerView?.let { windowManager?.removeView(it) }
        super.onDestroy()
    }
}
