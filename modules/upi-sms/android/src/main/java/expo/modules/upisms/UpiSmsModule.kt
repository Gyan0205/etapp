package expo.modules.upisms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UpiSmsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("UpiSms")

    // Turns the instant "add this payment?" notification on or off.
    Function("setEnabled") { enabled: Boolean ->
      context.getSharedPreferences(SmsReceiver.PREFS, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(SmsReceiver.KEY_ENABLED, enabled)
        .apply()
    }

    // Parses one SMS (used for self-tests).
    Function("parseSms") { sender: String, body: String ->
      UpiParser.parse(sender, body, System.currentTimeMillis())?.toMap()
    }

    // Reads the SMS inbox for UPI debits received at/after sinceMs (epoch millis).
    AsyncFunction("scanInbox") { sinceMs: Double ->
      val ctx = context
      if (ctx.checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
        return@AsyncFunction emptyList<Map<String, Any?>>()
      }
      val results = ArrayList<Map<String, Any?>>()
      try {
        ctx.contentResolver.query(
          Uri.parse("content://sms/inbox"),
          arrayOf("address", "body", "date"),
          "date >= ?",
          arrayOf(sinceMs.toLong().toString()),
          "date DESC"
        )?.use { cursor ->
          val addressIdx = cursor.getColumnIndex("address")
          val bodyIdx = cursor.getColumnIndex("body")
          val dateIdx = cursor.getColumnIndex("date")
          var scanned = 0
          while (cursor.moveToNext() && scanned < 400) {
            scanned++
            val address = cursor.getString(addressIdx) ?: continue
            val body = cursor.getString(bodyIdx) ?: continue
            val date = cursor.getLong(dateIdx)
            UpiParser.parse(address, body, date)?.let { results.add(it.toMap()) }
          }
        }
      } catch (e: SecurityException) {
        // Permission was revoked while scanning; report nothing found.
      }
      results
    }

    // Shows a sample "payment detected" notification so the user can check notifications work.
    AsyncFunction("sendTestNotification") {
      Notifier.show(
        context,
        UpiPayment(5200, "Test Merchant", "412345678901", System.currentTimeMillis(), "TEST")
      )
    }
  }
}
