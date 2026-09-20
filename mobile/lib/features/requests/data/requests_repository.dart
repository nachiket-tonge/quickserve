import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/service_request_model.dart';

class RequestsRepository {
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<ServiceRequestModel> createRequest({
    required String serviceId,
    required String description,
    required DateTime preferredDatetime,
    required String address,
    required String priority,
  }) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to create a service request.');
    }

    final response = await _supabase
        .from('service_requests')
        .insert({
          'customer_id': user.id,
          'service_id': serviceId,
          'description': description,
          'preferred_datetime': preferredDatetime.toUtc().toIso8601String(),
          'address': address,
          'priority': priority,
        })
        .select('''
          id,
          request_number,
          customer_id,
          agent_id,
          service_id,
          status,
          description,
          preferred_datetime,
          address,
          priority,
          created_at,
          updated_at,
          services (
            name
          )
        ''')
        .single();

    return ServiceRequestModel.fromMap(Map<String, dynamic>.from(response));
  }

  Future<List<ServiceRequestModel>> getMyRequests() async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to view your service requests.');
    }

    final response = await _supabase
        .from('service_requests')
        .select('''
          id,
          request_number,
          customer_id,
          agent_id,
          service_id,
          status,
          description,
          preferred_datetime,
          address,
          priority,
          created_at,
          updated_at,
          services (
            name
          )
        ''')
        .eq('customer_id', user.id)
        .order('created_at', ascending: false);

    return (response as List)
        .map(
          (item) =>
              ServiceRequestModel.fromMap(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<ServiceRequestModel> getRequestById(String requestId) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to view this request.');
    }

    final response = await _supabase
        .from('service_requests')
        .select('''
          id,
          request_number,
          customer_id,
          agent_id,
          service_id,
          status,
          description,
          preferred_datetime,
          address,
          priority,
          created_at,
          updated_at,
          services (
            name
          )
        ''')
        .eq('id', requestId)
        .eq('customer_id', user.id)
        .single();

    return ServiceRequestModel.fromMap(Map<String, dynamic>.from(response));
  }
}
