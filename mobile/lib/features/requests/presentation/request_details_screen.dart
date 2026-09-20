import 'package:flutter/material.dart';

import '../data/requests_repository.dart';
import '../models/service_request_model.dart';

class RequestDetailsScreen extends StatefulWidget {
  final String requestId;

  const RequestDetailsScreen({super.key, required this.requestId});

  @override
  State<RequestDetailsScreen> createState() => _RequestDetailsScreenState();
}

class _RequestDetailsScreenState extends State<RequestDetailsScreen> {
  final RequestsRepository _requestsRepository = RequestsRepository();

  late Future<ServiceRequestModel> _requestFuture;

  @override
  void initState() {
    super.initState();
    _requestFuture = _requestsRepository.getRequestById(widget.requestId);
  }

  Future<void> _refresh() async {
    setState(() {
      _requestFuture = _requestsRepository.getRequestById(widget.requestId);
    });

    await _requestFuture;
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'NEW':
        return 'New';
      case 'ASSIGNED':
        return 'Assigned';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  }

  String _priorityLabel(String? priority) {
    switch (priority) {
      case 'LOW':
        return 'Low';
      case 'MEDIUM':
        return 'Medium';
      case 'HIGH':
        return 'High';
      default:
        return 'Not specified';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  String _formatDateTime(DateTime date) {
    return '${_formatDate(date)} at '
        '${TimeOfDay.fromDateTime(date).format(context)}';
  }

  Widget _detailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Request Details')),
      body: FutureBuilder<ServiceRequestModel>(
        future: _requestFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48),
                    const SizedBox(height: 16),
                    const Text(
                      'Unable to load request details.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _refresh,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final request = snapshot.data;

          if (request == null) {
            return const Center(child: Text('Request not found.'));
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  request.requestNumber,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 8),

                Text(
                  request.serviceName ?? 'Service',
                  style: TextStyle(
                    fontSize: 18,
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),

                const SizedBox(height: 24),

                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        _detailRow(
                          icon: Icons.sync,
                          label: 'Status',
                          value: _statusLabel(request.status),
                        ),
                        _detailRow(
                          icon: Icons.flag_outlined,
                          label: 'Priority',
                          value: _priorityLabel(request.priority),
                        ),
                        _detailRow(
                          icon: Icons.description_outlined,
                          label: 'Description',
                          value:
                              request.description ?? 'No description provided',
                        ),
                        _detailRow(
                          icon: Icons.location_on_outlined,
                          label: 'Address',
                          value: request.address ?? 'No address provided',
                        ),
                        if (request.preferredDatetime != null)
                          _detailRow(
                            icon: Icons.event_outlined,
                            label: 'Preferred Date & Time',
                            value: _formatDateTime(request.preferredDatetime!),
                          ),
                        _detailRow(
                          icon: Icons.access_time,
                          label: 'Created',
                          value: _formatDateTime(request.createdAt),
                        ),
                        _detailRow(
                          icon: Icons.update,
                          label: 'Last Updated',
                          value: _formatDateTime(request.updatedAt),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
