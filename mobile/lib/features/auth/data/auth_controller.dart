import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/profile_service.dart';

class AuthController {
  final SupabaseClient _supabase = Supabase.instance.client;

  final ProfileService _profileService = ProfileService();

  Session? get currentSession => _supabase.auth.currentSession;

  User? get currentUser => _supabase.auth.currentUser;

  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  Future<String?> getCurrentUserRole() async {
    return await _profileService.getCurrentUserRole();
  }
}
