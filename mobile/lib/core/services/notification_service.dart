import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<void> initialize() async {
    await _requestPermission();

    _supabase.auth.onAuthStateChange.listen((authState) async {
      if (authState.session != null) {
        await _registerDeviceToken();
      }
    });

    if (_supabase.auth.currentSession != null) {
      await _registerDeviceToken();
    }

    _messaging.onTokenRefresh.listen((newToken) async {
      debugPrint('FCM Token refreshed');

      if (_supabase.auth.currentUser != null) {
        await _saveDeviceToken(newToken);
      }
    });
  }

  Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    debugPrint(
      'Notification permission status: '
      '${settings.authorizationStatus}',
    );
  }

  Future<void> _registerDeviceToken() async {
    try {
      final user = _supabase.auth.currentUser;

      if (user == null) {
        debugPrint('No authenticated user. FCM token not saved.');
        return;
      }

      final token = await _messaging.getToken();

      if (token == null) {
        debugPrint('FCM token is null.');
        return;
      }

      await _saveDeviceToken(token);

      debugPrint('FCM device token registered successfully.');
    } catch (error) {
      debugPrint('Failed to register FCM device token: $error');
    }
  }

  Future<void> _saveDeviceToken(String token) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      return;
    }

    await _supabase.from('device_tokens').upsert({
      'user_id': user.id,
      'fcm_token': token,
      'platform': defaultTargetPlatform == TargetPlatform.iOS
          ? 'ios'
          : 'android',
      'updated_at': DateTime.now().toIso8601String(),
    }, onConflict: 'user_id,fcm_token');
  }
}
