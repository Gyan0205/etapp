package expo.modules.upisms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/** Fires when any SMS arrives; shows the "add this expense?" prompt for UPI debit messages. */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    if (!context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    if (messages.isEmpty()) return
    val sender = messages[0].originatingAddress ?: return
    val body = messages.joinToString("") { it.messageBody ?: "" }

    val payment = UpiParser.parse(sender, body, System.currentTimeMillis()) ?: return
    Notifier.show(context, payment)
  }

  companion object {
    const val PREFS = "upi_sms"
    const val KEY_ENABLED = "enabled"
  }
}
