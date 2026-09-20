import 'package:flutter/material.dart';

import '../data/services_repository.dart';
import '../models/service_model.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final ServicesRepository _repository = ServicesRepository();

  late Future<List<ServiceModel>> _servicesFuture;

  @override
  void initState() {
    super.initState();
    _servicesFuture = _repository.getServices();
  }

  Future<void> _refreshServices() async {
    setState(() {
      _servicesFuture = _repository.getServices();
    });

    await _servicesFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Services')),
      body: FutureBuilder<List<ServiceModel>>(
        future: _servicesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return _ErrorState(onRetry: _refreshServices);
          }

          final services = snapshot.data ?? [];

          if (services.isEmpty) {
            return const _EmptyServicesState();
          }

          return RefreshIndicator(
            onRefresh: _refreshServices,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: services.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final service = services[index];

                return _ServiceCard(service: service);
              },
            ),
          );
        },
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final ServiceModel service;

  const _ServiceCard({required this.service});

  IconData _getIcon(String serviceName) {
    switch (serviceName.toLowerCase()) {
      case 'ac':
        return Icons.ac_unit;

      case 'cleaning':
        return Icons.cleaning_services_outlined;

      case 'electrical':
        return Icons.electrical_services_outlined;

      case 'plumbing':
        return Icons.plumbing_outlined;

      default:
        return Icons.home_repair_service_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                _getIcon(service.name),
                color: Theme.of(context).colorScheme.onPrimaryContainer,
              ),
            ),

            const SizedBox(width: 16),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    service.name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  if (service.description != null &&
                      service.description!.trim().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      service.description!,
                      style: TextStyle(
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final Future<void> Function() onRetry;

  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, size: 56),

            const SizedBox(height: 16),

            const Text(
              'Unable to load services',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 8),

            const Text(
              'Please check your connection and try again.',
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 20),

            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class _EmptyServicesState extends StatelessWidget {
  const _EmptyServicesState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.home_repair_service_outlined, size: 56),
            SizedBox(height: 16),
            Text(
              'No services available',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text('Please check again later.', textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
