import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../data/profile_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ProfileService _profileService = ProfileService();

  final _formKey = GlobalKey<FormState>();

  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _roleController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;

  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _roleController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await _profileService.getCurrentUserProfile();

      if (!mounted) return;

      if (profile == null) {
        setState(() {
          _errorMessage = 'Profile not found.';
          _isLoading = false;
        });
        return;
      }

      final role = profile['role'] as String?;

      setState(() {
        _fullNameController.text = (profile['full_name'] as String?) ?? '';

        _phoneController.text = (profile['phone'] as String?) ?? '';

        _emailController.text = (profile['email'] as String?) ?? '';

        _roleController.text = _roleLabel(role);

        _isLoading = false;
        _errorMessage = null;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _errorMessage = _getErrorMessage(error);
        _isLoading = false;
      });
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      await _profileService.updateCurrentUserProfile(
        fullName: _fullNameController.text.trim(),
        phone: _phoneController.text.trim().isEmpty
            ? null
            : _phoneController.text.trim(),
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated successfully.')),
      );

      setState(() {
        _isSaving = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _errorMessage = _getErrorMessage(error);
        _isSaving = false;
      });
    }
  }

  String _getErrorMessage(Object error) {
    return error.toString().replaceFirst('Exception: ', '');
  }

  String _roleLabel(String? role) {
    switch (role) {
      case 'customer':
        return 'Customer';

      case 'agent':
        return 'Agent';

      case 'admin':
        return 'Administrator';

      default:
        return 'Unknown';
    }
  }

  String _getInitial() {
    final name = _fullNameController.text.trim();

    if (name.isEmpty) {
      return '?';
    }

    return name[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Profile')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null && _fullNameController.text.isEmpty
          ? _buildErrorState()
          : _buildProfileForm(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48),

            const SizedBox(height: 16),

            Text(_errorMessage!, textAlign: TextAlign.center),

            const SizedBox(height: 16),

            FilledButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _errorMessage = null;
                });

                _loadProfile();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileForm() {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Profile avatar
          Center(
            child: CircleAvatar(
              radius: 42,
              child: Text(
                _getInitial(),
                style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Error message
          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _errorMessage!,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onErrorContainer,
                ),
              ),
            ),

            const SizedBox(height: 16),
          ],

          // Full name
          TextFormField(
            controller: _fullNameController,
            enabled: !_isSaving,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Full Name',
              prefixIcon: Icon(Icons.person_outline),
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              final name = value?.trim() ?? '';

              if (name.isEmpty) {
                return 'Please enter your full name';
              }

              if (name.length < 2) {
                return 'Name must be at least 2 characters';
              }

              return null;
            },
          ),

          const SizedBox(height: 20),

          // Email
          TextFormField(
            controller: _emailController,
            enabled: false,
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined),
              border: OutlineInputBorder(),
            ),
          ),

          const SizedBox(height: 20),

          // Phone
          TextFormField(
            controller: _phoneController,
            enabled: !_isSaving,
            keyboardType: TextInputType.phone,
            maxLength: 15,
            decoration: const InputDecoration(
              labelText: 'Phone',
              prefixIcon: Icon(Icons.phone_outlined),
              border: OutlineInputBorder(),
            ),
            validator: (value) {
              final phone = value?.trim() ?? '';

              if (phone.isEmpty) {
                return null;
              }

              if (!RegExp(r'^[0-9+\-\s]{10,15}$').hasMatch(phone)) {
                return 'Enter a valid phone number';
              }

              return null;
            },
          ),

          const SizedBox(height: 20),

          // Role
          TextFormField(
            controller: _roleController,
            enabled: false,
            decoration: const InputDecoration(
              labelText: 'Role',
              prefixIcon: Icon(Icons.badge_outlined),
              border: OutlineInputBorder(),
            ),
          ),

          const SizedBox(height: 28),

          // Save button
          FilledButton(
            onPressed: _isSaving ? null : _saveProfile,
            child: _isSaving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save Changes'),
          ),

          const SizedBox(height: 12),

          // Logout
          OutlinedButton.icon(
            onPressed: _isSaving
                ? null
                : () {
                    context.push('/logout');
                  },
            icon: const Icon(Icons.logout),
            label: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
