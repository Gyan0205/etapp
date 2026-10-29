import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface DetectedPayment {
  amountPaise: number;
  payee: string;
  /** UPI reference number from the bank SMS; may be empty if the SMS had none. */
  txnId: string;
  /** When the SMS arrived (epoch ms). */
  timestamp: number;
  sender: string;
}

declare class UpiSmsNativeModule extends NativeModule {
  setEnabled(enabled: boolean): void;
  parseSms(sender: string, body: string): DetectedPayment | null;
  scanInbox(sinceMs: number): Promise<DetectedPayment[]>;
  sendTestNotification(): Promise<void>;
}

/** null when the native module is not part of this build (e.g. Expo Go). */
export default requireOptionalNativeModule<UpiSmsNativeModule>('UpiSms');
