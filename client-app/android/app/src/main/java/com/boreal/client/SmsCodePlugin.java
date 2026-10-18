package com.boreal.client;

// BF_CLIENT_v823_SMS_CODE - Android's one-tap sign-in code. After Boreal texts the 6-digit code, Android asks
// "Allow Boreal Financial to read this one message?"; one tap fills the code in. It uses Google's SMS User Consent
// API, so the app never gets general SMS access (no SMS permission). iPhone already offers the code above the
// keyboard (autocomplete="one-time-code"). JS side: src/native/smsCode.ts.

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.phone.SmsRetriever;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.common.api.Status;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "SmsCode")
public class SmsCodePlugin extends Plugin {
    private static final Pattern CODE = Pattern.compile("(?<!\\d)(\\d{6})(?!\\d)");
    private PluginCall waiting;
    private BroadcastReceiver receiver;

    /** Resolves with {code} when the person allows the message, or {code: null} when they don't / it times out. */
    @PluginMethod(returnType = PluginMethod.RETURN_PROMISE)
    public void waitForCode(PluginCall call) {
        stopListening();
        waiting = call;
        call.setKeepAlive(true);
        getBridge().saveCall(call);
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!SmsRetriever.SMS_RETRIEVED_ACTION.equals(intent.getAction())) return;
                Bundle extras = intent.getExtras();
                Status status = extras == null ? null : (Status) extras.get(SmsRetriever.EXTRA_STATUS);
                if (status == null || status.getStatusCode() != CommonStatusCodes.SUCCESS) {
                    finish(null);
                    return;
                }
                Intent consent = extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT);
                if (consent == null || waiting == null) {
                    finish(null);
                    return;
                }
                try {
                    startActivityForResult(waiting, consent, "consentResult");
                } catch (Exception e) {
                    finish(null);
                }
            }
        };
        IntentFilter filter = new IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(receiver, filter, SmsRetriever.SEND_PERMISSION, null, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter, SmsRetriever.SEND_PERMISSION, null);
        }
        SmsRetriever.getClient(getContext()).startSmsUserConsent(null)
                .addOnFailureListener(e -> finish(null));
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        finish(null);
        call.resolve();
    }

    @ActivityCallback
    private void consentResult(PluginCall call, ActivityResult result) {
        String code = null;
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            code = extractCode(result.getData().getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE));
        }
        finish(code);
    }

    static String extractCode(String message) {
        if (message == null) return null;
        Matcher matcher = CODE.matcher(message);
        return matcher.find() ? matcher.group(1) : null;
    }

    private void finish(String code) {
        PluginCall call = waiting;
        waiting = null;
        stopListening();
        if (call == null) return;
        JSObject result = new JSObject();
        result.put("code", code);
        call.setKeepAlive(false);
        call.resolve(result);
        getBridge().releaseCall(call);
    }

    private void stopListening() {
        if (receiver != null) {
            try { getContext().unregisterReceiver(receiver); } catch (IllegalArgumentException ignored) { }
            receiver = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopListening();
        super.handleOnDestroy();
    }
}
