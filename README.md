# Expense Tracker (ETApp)

A simple, offline expense tracker for Android, built with React Native (Expo) and TypeScript.
All data is stored on the phone in a local SQLite database. Nothing is uploaded anywhere.

## Features

- Quick add: amount, category, payment mode (UPI / Cash / Card / Other), date and note
- Home dashboard: this month's total, today, daily average, last 7 days chart
- History: browse month by month, category breakdown, tap a category to filter
- Same-day, same-category payments are grouped into one line you can expand
- **UPI payment detection (Android):** reads bank debit SMS, shows an "Add this expense?" notification
  and pre-fills the amount, payee and UPI transaction ID. You just pick a category
- **Home-screen widget:** shows today's and this month's totals, with a **+** button that opens the Add screen in one tap
- Light and dark mode, INR (₹)

## Getting started

Requires Node.js 20+.

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on an Android phone on the same Wi-Fi.

> The UPI detection feature uses a custom native module (`modules/upi-sms`), so it does **not** work in
> Expo Go. Everything else does. To try detection, install a real build (below).

## Building an installable APK

Builds run in the cloud with [EAS Build](https://docs.expo.dev/build/introduction/) (free tier is enough).
Building locally on Windows can fail because of the 260-character path limit.

```bash
npx eas-cli@latest login
```

`app.json` currently contains the original author's Expo `owner` and `extra.eas.projectId`. Before your first
build, **delete the `"owner"` line and the whole `"extra": { "eas": ... }` block** from `app.json`, then:

```bash
npx eas-cli@latest init          # creates a project under YOUR Expo account and fills those fields in
npx eas-cli@latest build --platform android --profile preview
```

You will also want to change `android.package` in `app.json` (currently `com.gyan.expensetracker`) and bump
`version` / `android.versionCode` for each build so the APKs install over each other.

## Home-screen widget

Long-press the home screen, choose **Widgets → Expense Tracker**, and drag the green bar out. Tap it (or the **+**)
to open the Add expense screen. Totals refresh when you add, edit or delete an expense and when the app opens.
The widget is native Kotlin in `modules/upi-sms/android/` (`ExpenseWidget.kt`, `res/layout/widget_add.xml`),
so it also needs a real build, not Expo Go.

## UPI detection notes

- Needs SMS and notification permissions. Android may block the SMS permission for apps installed from a file:
  open **Settings → Apps → Expense Tracker → ⋮ → Allow restricted settings**, then allow SMS.
- Google Play Protect may block the install because of the SMS permission. You can pause Play Protect while installing.
- Only bank messages that look like UPI debits are used. SMS formats differ between banks; the parser is in
  `modules/upi-sms/android/src/main/java/expo/modules/upisms/UpiParser.kt`. Pull requests that add formats are welcome.

## Project layout

```
App.tsx                      navigation, theme, notification deep link handling
src/screens/                 Home, History, Add/Edit expense, Settings
src/components/              rows, grouped rows, small UI pieces
src/services/                SQLite access, expense queries, UPI detection logic
src/categories.ts            category list (edit here to add or change categories)
src/theme.ts                 colours (light and dark)
modules/upi-sms/             local Expo module (Kotlin): SMS receiver, parser, notification, home-screen widget
```

## Changelog

### 10 November 2026
- Added the **Investments** category (sky-blue, trending-up icon), placed after Savings. (v1.5.2)
- Added a **home-screen widget** with today's total, this month's total and a **+** button that opens the Add
  expense screen. (v1.6.0)
- Widget totals update automatically after adding, editing or deleting an expense and on app start.
- Fixed the widget's "This month" line being cut off: tighter padding, smaller text, taller and resizable. (v1.6.1)
- Corrected the README instructions for building under your own Expo account (remove `owner` and `extra.eas`
  before `eas init`) and documented the widget.

## License

MIT, see [LICENSE](LICENSE).
