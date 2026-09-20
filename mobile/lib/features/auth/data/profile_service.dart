import 'package:supabase_flutter/supabase_flutter.dart';

class ProfileService {
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<Map<String, dynamic>?> getCurrentUserProfile() async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      return null;
    }

    final profile = await _supabase
        .from('profiles')
        .select('id, full_name, phone, role, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();

    return profile;
  }

  Future<String?> getCurrentUserRole() async {
    final profile = await getCurrentUserProfile();

    return profile?['role'] as String?;
  }

  Future<Map<String, dynamic>> updateCurrentUserProfile({
    required String fullName,
    String? phone,
  }) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to update your profile.');
    }

    final response = await _supabase
        .from('profiles')
        .update({'full_name': fullName, 'phone': phone})
        .eq('id', user.id)
        .select('id, full_name, phone, role, created_at, updated_at')
        .single();

    return Map<String, dynamic>.from(response);
  }
}
