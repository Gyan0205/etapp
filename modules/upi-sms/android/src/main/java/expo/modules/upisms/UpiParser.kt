package expo.modules.upisms

data class UpiPayment(
  val amountPaise: Int,
  val payee: String,
  val txnId: String,
  val timestamp: Long,
  val sender: String
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "amountPaise" to amountPaise,
    "payee" to payee,
    "txnId" to txnId,
    "timestamp" to timestamp.toDouble(),
    "sender" to sender
  )
}

/**
 * Pulls amount / payee / UPI reference out of a bank "debited via UPI" SMS.
 * Works for PhonePe, Paytm and Google Pay payments alike, because the bank sends
 * the same SMS whichever app was used.
 */
object UpiParser {
  private val OPT = setOf(RegexOption.IGNORE_CASE)

  private val NOT_A_PAYMENT = Regex(
    """otp|will be debited|mandate|autopay|auto[- ]debit|failed|declined|unsuccessful|reversed|refund|requested|collect request""",
    OPT
  )
  private val HAS_DEBIT = Regex("""\b(debited|debit|sent|paid|transferred|transfer)\b""", OPT)
  private val HAS_CREDIT = Regex("""\b(credited|received|deposited)\b""", OPT)
  private val BALANCE_CUT = Regex("""avl\.?\s*bal|available\s*bal|total\s*bal|bal\s*:""", OPT)

  private val AMOUNT_AFTER_DEBIT = Regex(
    """(?:debited|sent|paid|transferred)\s*(?:by|for|with|of)?\s*(?:rs\.?|inr|₹)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)""",
    OPT
  )
  private val AMOUNT_RS = Regex("""(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)""", OPT)

  private val TXN_PATTERNS = listOf(
    Regex("""upi\s*(?:ref(?:erence)?\.?\s*(?:no\.?|number|id)?|txn\s*id|transaction\s*id)\s*[:\-#]?\s*([0-9]{9,18})""", OPT),
    Regex("""(?:ref(?:erence)?\.?\s*(?:no\.?|number|id)?|refno|rrn|utr|txn\s*id|transaction\s*id)\s*[:\-#]?\s*([0-9]{9,18})""", OPT),
    Regex("""upi/(?:p2a|p2m|p2p|dr|cr)/([0-9]{9,18})""", OPT),
    Regex("""\b([0-9]{12})\b""", OPT)
  )

  private val PAYEE_TO = Regex(
    """\b(?:to|towards)\s+(?:vpa\s+)?([A-Za-z0-9@][A-Za-z0-9@._&' \-]{1,40}?)(?=\s+(?:on|ref|refno|upi|via|utr|rrn|txn|if|call|not|avl|bal|dated)\b|\s*[,;(]|\.\s|\.${'$'}|\s*${'$'})""",
    OPT
  )
  // ICICI style: "...; Rahul Sharma credited."   Axis style: "UPI/P2A/429876543210/Rahul Shar"
  private val PAYEE_CREDITED = Regex("""[;,]\s*([A-Za-z][A-Za-z .&'\-]{1,40}?)\s+credited""", OPT)
  private val PAYEE_UPI_PATH = Regex("""upi/(?:p2a|p2m|p2p)/[0-9]{9,18}/([A-Za-z0-9][A-Za-z0-9 .&'\-]{1,30})""", OPT)
  private val VPA = Regex("""\b([A-Za-z0-9._\-]{2,}@[A-Za-z]{2,})\b""")

  fun parse(sender: String, body: String, timestamp: Long): UpiPayment? {
    // Bank / service SMS come from alphanumeric headers (e.g. VM-HDFCBK), not phone numbers.
    if (sender.none { it.isLetter() }) return null

    val text = body.replace(Regex("""\s+"""), " ").trim()
    val lower = text.lowercase()
    if (!lower.contains("upi") && !lower.contains("vpa")) return null
    if (NOT_A_PAYMENT.containsMatchIn(text)) return null
    if (!HAS_DEBIT.containsMatchIn(text)) return null
    if (HAS_CREDIT.containsMatchIn(text) && !Regex("""debited|\bsent\b|\bpaid\b""", OPT).containsMatchIn(text)) return null

    val head = BALANCE_CUT.split(text).first()
    val rawAmount = AMOUNT_AFTER_DEBIT.find(head)?.groupValues?.get(1)
      ?: AMOUNT_RS.find(head)?.groupValues?.get(1)
      ?: return null
    val value = rawAmount.replace(",", "").toDoubleOrNull() ?: return null
    val paise = Math.round(value * 100)
    if (paise <= 0 || paise > 1_000_000_000L) return null

    var txn = ""
    for (re in TXN_PATTERNS) {
      val m = re.find(text)
      if (m != null) {
        txn = m.groupValues[1]
        break
      }
    }

    var payee = PAYEE_TO.find(text)?.groupValues?.get(1)?.trim()
      ?: PAYEE_CREDITED.find(text)?.groupValues?.get(1)?.trim()
      ?: PAYEE_UPI_PATH.find(text)?.groupValues?.get(1)?.trim()
      ?: ""
    payee = payee.replace(Regex("""\s+(?:not you|if not|call)\b.*""", OPT), "").removeSuffix(" UPI").trim()
    if (payee.length < 2 || payee.all { it.isDigit() }) {
      payee = VPA.find(text)?.groupValues?.get(1) ?: ""
    }

    return UpiPayment(paise.toInt(), payee, txn, timestamp, sender)
  }
}
