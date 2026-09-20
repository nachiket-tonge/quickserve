import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/requests_repository.dart';
import '../models/service_request_model.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  final RequestsRepository _requestsRepository = RequestsRepository();

  late Future<List<ServiceRequestModel>> _requestsFuture;

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  void _loadRequests() {
    _requestsFuture = _requestsRepository.getMyRequests();
  }

  Future<void> _refreshRequests() async {
    setState(() {
      _loadRequests();
    });

    await _requestsFuture;
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

  Color _statusColor(BuildContext context, String status) {
    final colors = Theme.of(context).colorScheme;

    switch (status) {
      case 'COMPLETED':
        return colors.primary;
      case 'CANCELLED':
        return colors.error;
      case 'IN_PROGRESS':
        return colors.secondary;
      case 'ASSIGNED':
        return colors.tertiary;
      default:
        return colors.outline;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Requests')),
      body: FutureBuilder<List<ServiceRequestModel>>(
        future: _requestsFuture,
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
                      'Unable to load your requests.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () {
                        setState(_loadRequests);
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final requests = snapshot.data ?? [];

          if (requests.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refreshRequests,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 140),
                  Icon(Icons.receipt_long_outlined, size: 64),
                  SizedBox(height: 16),
                  Center(
                    child: Text(
                      'You have no service requests yet.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _refreshRequests,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: requests.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final request = requests[index];
                final statusColor = _statusColor(context, request.status);

                return Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {
                      context.push('/requests/${request.id}');
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  request.requestNumber,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              Chip(
                                label: Text(_statusLabel(request.status)),
                                side: BorderSide.none,
                                labelStyle: TextStyle(
                                  color: statusColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 12),

                          Text(
                            request.serviceName ?? 'Service',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w600,
                            ),
                          ),

                          if (request.description != null) ...[
                            const SizedBox(height: 6),
                            Text(
                              request.description!,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],

                          const SizedBox(height: 12),

                          Row(
                            children: [
                              const Icon(Icons.flag_outlined, size: 18),
                              const SizedBox(width: 6),
                              Text(_priorityLabel(request.priority)),
                              const SizedBox(width: 20),
                              const Icon(
                                Icons.calendar_today_outlined,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(_formatDate(request.createdAt)),
                            ],
                          ),

                          const SizedBox(height: 8),

                          const Align(
                            alignment: Alignment.centerRight,
                            child: Icon(Icons.chevron_right),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
