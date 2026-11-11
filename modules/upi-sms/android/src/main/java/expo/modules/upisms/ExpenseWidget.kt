package expo.modules.upisms

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

/** Home-screen widget: shows today / month totals and opens the Add Expense screen on tap. */
class ExpenseWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) manager.updateAppWidget(id, build(context))
  }

  companion object {
    const val PREFS = "expense_widget"

    fun saveAndRefresh(context: Context, today: String, month: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().putString("today", today).putString("month", month).apply()
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, ExpenseWidget::class.java))
      for (id in ids) manager.updateAppWidget(id, build(context))
    }

    private fun build(context: Context): RemoteViews {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val views = RemoteViews(context.packageName, R.layout.widget_add)
      views.setTextViewText(R.id.widget_today, prefs.getString("today", "₹0"))
      views.setTextViewText(R.id.widget_month, "This month " + prefs.getString("month", "₹0"))

      val open = Intent(Intent.ACTION_VIEW, Uri.parse("expensetracker://add")).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      val pending = PendingIntent.getActivity(
        context, 7001, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_root, pending)
      views.setOnClickPendingIntent(R.id.widget_plus, pending)
      return views
    }
  }
}
