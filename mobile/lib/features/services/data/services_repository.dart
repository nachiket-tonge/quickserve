import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/service_model.dart';

class ServicesRepository {
  final SupabaseClient _supabase = Supabase.instance.client;

 Future<List<ServiceModel>> getServices() async {
    final response = await _supabase
        .from('services')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

    return (response as List)
        .map((item) => ServiceModel.fromMap(Map<String, dynamic>.from(item)))
        .toList();
  }
}
