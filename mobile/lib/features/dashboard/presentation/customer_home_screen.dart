import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../auth/data/profile_service.dart';

class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({super.key});

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  final ProfileService _profileService = ProfileService();

  String? _fullName;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await _profileService.getCurrentUserProfile();

      if (!mounted) return;

      setState(() {
        _fullName = profile?['full_name'] as String?;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _fullName?.trim();

    return Scaffold(
      appBar: AppBar(title: const Text('QuickServe')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadProfile,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 8),

              Text(
                _isLoading
                    ? 'Welcome'
                    : 'Welcome${name != null && name.isNotEmpty ? ', $name' : ''}',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 8),

              const Text(
                'What service do you need today?',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),

              const SizedBox(height: 28),

              _HomeActionCard(
                icon: Icons.home_repair_service_outlined,
                title: 'Browse Services',
                subtitle: 'Explore the services available on QuickServe.',
                onTap: () {
                  context.push('/services');
                },
              ),

              const SizedBox(height: 16),

              _HomeActionCard(
                icon: Icons.add_circle_outline,
                title: 'Create Service Request',
                subtitle: 'Request a service from our service team.',
                onTap: () {
                  context.push('/create-request');
                },
              ),

              const SizedBox(height: 16),

              _HomeActionCard(
                icon: Icons.receipt_long_outlined,
                title: 'My Requests',
                subtitle: 'Track the service requests you have created.',
                onTap: () {
                  context.push('/my-requests');
                },
              ),

              const SizedBox(height: 16),

              _HomeActionCard(
                icon: Icons.person_outline,
                title: 'My Profile',
                subtitle: 'View and manage your QuickServe profile.',
                onTap: () {
                  context.push('/profile');
                },
              ),

              const SizedBox(height: 32),

              OutlinedButton.icon(
                onPressed: () {
                  context.push('/logout');
                },
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _HomeActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
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
                  icon,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),

              const SizedBox(width: 16),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      subtitle,
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                  ],
                ),
              ),

              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}
