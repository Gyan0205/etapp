package expo.modules.upisms

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import java.text.NumberFormat
import java.util.Locale

object Notifier {
  private const val CHANNEL_ID = "upi_payments"
  const val SCHEME = "expensetracker"

  fun show(context: Context, p: UpiPayment) {
    if (Build.VERSION.SDK_INT >= 33 &&
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return

    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL_ID, "UPI payments", NotificationManager.IMPORTANCE_HIGH)
      channel.description = "Asks if you want to add a UPI payment to Expense Tracker"
      nm.createNotificationChannel(channel)
    }

    val uri = Uri.Builder()
      .scheme(SCHEME)
      .authority("add-upi")
      .appendQueryParameter("amount", p.amountPaise.toString())
      .appendQueryParameter("payee", p.payee)
      .appendQueryParameter("txn", p.txnId)
      .appendQueryParameter("ts", p.timestamp.toString())
      .build()

    val open = Intent(Intent.ACTION_VIEW, uri).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val notificationId = (if (p.txnId.isNotEmpty()) p.txnId else "${p.timestamp}-${p.amountPaise}").hashCode()
    val pending = PendingIntent.getActivity(
      context, notificationId, open,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val rupees = NumberFormat.getNumberInstance(Locale("en", "IN")).apply {
      maximumFractionDigits = 2
      minimumFractionDigits = 0
    }.format(p.amountPaise / 100.0)
    val title = "₹$rupees payment detected"
    val to = if (p.payee.isNotEmpty()) "Paid to ${p.payee}. " else ""
    val ref = if (p.txnId.isNotEmpty()) " Ref ${p.txnId}." else ""
    val text = "${to}Add it to Expense Tracker?"

    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL_ID) else Notification.Builder(context)
    val notification = builder
      .setSmallIcon(R.drawable.ic_upi_notification)
      .setContentTitle(title)
      .setContentText(text)
      .setStyle(Notification.BigTextStyle().bigText("$text$ref"))
      .setContentIntent(pending)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_MESSAGE)
      .build()

    nm.notify(notificationId, notification)
  }
}
