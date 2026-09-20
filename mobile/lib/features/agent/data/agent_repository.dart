import 'package:supabase_flutter/supabase_flutter.dart';

import '../../requests/models/service_request_model.dart';
import '../models/request_note_model.dart';

class AgentRepository {
  final SupabaseClient _supabase = Supabase.instance.client;

  static const String _requestSelect = '''
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
  ''';

  /// Returns all requests assigned to the currently logged-in agent.
  Future<List<ServiceRequestModel>> getAssignedRequests() async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to view assigned requests.');
    }

    final response = await _supabase
        .from('service_requests')
        .select(_requestSelect)
        .eq('agent_id', user.id)
        .order('created_at', ascending: false);

    return (response as List)
        .map(
          (item) =>
              ServiceRequestModel.fromMap(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  /// Returns a single request assigned to the currently logged-in agent.
  Future<ServiceRequestModel> getAssignedRequestById(String requestId) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to view this request.');
    }

    final response = await _supabase
        .from('service_requests')
        .select(_requestSelect)
        .eq('id', requestId)
        .eq('agent_id', user.id)
        .single();

    return ServiceRequestModel.fromMap(Map<String, dynamic>.from(response));
  }

  /// Updates the status of an assigned request.
  ///
  /// PostgreSQL RLS and the status-validation trigger remain
  /// the final authority over whether the transition is allowed.
  Future<ServiceRequestModel> updateRequestStatus({
    required String requestId,
    required String newStatus,
  }) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to update request status.');
    }

    final response = await _supabase
        .from('service_requests')
        .update({'status': newStatus})
        .eq('id', requestId)
        .eq('agent_id', user.id)
        .select(_requestSelect)
        .single();

    return ServiceRequestModel.fromMap(Map<String, dynamic>.from(response));
  }

  /// Returns all notes belonging to a request.
  Future<List<RequestNoteModel>> getRequestNotes(String requestId) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to view request notes.');
    }

    final response = await _supabase
        .from('request_notes')
        .select('''
          id,
          request_id,
          author_id,
          note,
          created_at,
          updated_at
        ''')
        .eq('request_id', requestId)
        .order('created_at', ascending: true);

    return (response as List)
        .map(
          (item) => RequestNoteModel.fromMap(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  /// Adds a note to an assigned request.
  ///
  /// author_id is always taken from the authenticated Supabase user.
  Future<RequestNoteModel> addRequestNote({
    required String requestId,
    required String note,
  }) async {
    final user = _supabase.auth.currentUser;

    if (user == null) {
      throw Exception('You must be logged in to add a request note.');
    }

    final trimmedNote = note.trim();

    if (trimmedNote.isEmpty) {
      throw Exception('Note cannot be empty.');
    }

    final response = await _supabase
        .from('request_notes')
        .insert({
          'request_id': requestId,
          'author_id': user.id,
          'note': trimmedNote,
        })
        .select('''
          id,
          request_id,
          author_id,
          note,
          created_at,
          updated_at
        ''')
        .single();

    return RequestNoteModel.fromMap(Map<String, dynamic>.from(response));
  }
}
