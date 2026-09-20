import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/data/services_repository.dart';
import '../../services/models/service_model.dart';
import '../data/requests_repository.dart';

class CreateRequestScreen extends StatefulWidget {
  const CreateRequestScreen({super.key});

  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  final _formKey = GlobalKey<FormState>();

  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();

  final ServicesRepository _servicesRepository = ServicesRepository();
  final RequestsRepository _requestsRepository = RequestsRepository();

  List<ServiceModel> _services = [];

  String? _selectedServiceId;
  String _selectedPriority = 'LOW';

  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;

  bool _isLoadingServices = true;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _loadServices() async {
    try {
      final services = await _servicesRepository.getServices();

      if (!mounted) return;

      setState(() {
        _services = services;
        _isLoadingServices = false;
        _errorMessage = null;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _errorMessage = _getErrorMessage(error);
        _isLoadingServices = false;
      });
    }
  }

  Future<void> _selectDate() async {
    final now = DateTime.now();

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 2),
    );

    if (pickedDate == null || !mounted) {
      return;
    }

    setState(() {
      _selectedDate = pickedDate;
    });
  }

  Future<void> _selectTime() async {
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? TimeOfDay.now(),
    );

    if (pickedTime == null || !mounted) {
      return;
    }

    setState(() {
      _selectedTime = pickedTime;
    });
  }

  Future<void> _submitRequest() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedDate == null) {
      _showMessage('Please select a preferred date.');
      return;
    }

    if (_selectedTime == null) {
      _showMessage('Please select a preferred time.');
      return;
    }

    final serviceId = _selectedServiceId;

    if (serviceId == null) {
      _showMessage('Please select a service.');
      return;
    }

    final preferredDatetime = DateTime(
      _selectedDate!.year,
      _selectedDate!.month,
      _selectedDate!.day,
      _selectedTime!.hour,
      _selectedTime!.minute,
    );

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final request = await _requestsRepository.createRequest(
        serviceId: serviceId,
        description: _descriptionController.text.trim(),
        preferredDatetime: preferredDatetime,
        address: _addressController.text.trim(),
        priority: _selectedPriority,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Request ${request.requestNumber} created successfully.',
          ),
        ),
      );

      context.pop();
    } on AuthException catch (error) {
      if (!mounted) return;

      setState(() {
        _errorMessage = error.message;
        _isSubmitting = false;
      });
    } on PostgrestException catch (error) {
      if (!mounted) return;

      setState(() {
        _errorMessage = error.message;
        _isSubmitting = false;
      });
    } catch (error) {
      if (!mounted) return;

      setState(() {
        _errorMessage = _getErrorMessage(error);
        _isSubmitting = false;
      });
    }
  }

  String _getErrorMessage(Object error) {
    if (error is PostgrestException) {
      return error.message;
    }

    if (error is AuthException) {
      return error.message;
    }

    return error.toString().replaceFirst('Exception: ', '');
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  String _formatDate(DateTime? date) {
    if (date == null) {
      return 'Select date';
    }

    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  String _formatTime(TimeOfDay? time) {
    if (time == null) {
      return 'Select time';
    }

    return time.format(context);
  }

 

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Service Request')),
      body: _isLoadingServices
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadServices,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  const Text(
                    'Request a Service',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Provide the details below to create your service request.',
                  ),
                  const SizedBox(height: 24),

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

                  if (_services.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text('No services are currently available.'),
                    )
                  else
                    Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          DropdownButtonFormField<String>(
                            initialValue: _selectedServiceId,
                            decoration: const InputDecoration(
                              labelText: 'Service',
                              border: OutlineInputBorder(),
                            ),
                            items: _services
                                .map(
                                  (service) => DropdownMenuItem<String>(
                                    value: service.id,
                                    child: Text(service.name),
                                  ),
                                )
                                .toList(),
                            onChanged: _isSubmitting
                                ? null
                                : (value) {
                                    setState(() {
                                      _selectedServiceId = value;
                                    });
                                  },
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please select a service';
                              }

                              return null;
                            },
                          ),

                          const SizedBox(height: 20),

                          TextFormField(
                            controller: _descriptionController,
                            enabled: !_isSubmitting,
                            maxLines: 5,
                            maxLength: 500,
                            decoration: const InputDecoration(
                              labelText: 'Description',
                              hintText: 'Describe the service you need...',
                              border: OutlineInputBorder(),
                              alignLabelWithHint: true,
                            ),
                            validator: (value) {
                              final text = value?.trim() ?? '';

                              if (text.isEmpty) {
                                return 'Please enter a description';
                              }

                              if (text.length > 500) {
                                return 'Description cannot exceed 500 characters';
                              }

                              return null;
                            },
                          ),

                          const SizedBox(height: 20),

                          TextFormField(
                            controller: _addressController,
                            enabled: !_isSubmitting,
                            maxLines: 3,
                            maxLength: 300,
                            decoration: const InputDecoration(
                              labelText: 'Address',
                              hintText: 'Enter the service location...',
                              border: OutlineInputBorder(),
                              alignLabelWithHint: true,
                            ),
                            validator: (value) {
                              final text = value?.trim() ?? '';

                              if (text.isEmpty) {
                                return 'Please enter the address';
                              }

                              if (text.length > 300) {
                                return 'Address cannot exceed 300 characters';
                              }

                              return null;
                            },
                          ),

                          const SizedBox(height: 20),

                          const Text(
                            'Preferred Date',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),

                          OutlinedButton.icon(
                            onPressed: _isSubmitting ? null : _selectDate,
                            icon: const Icon(Icons.calendar_today),
                            label: Text(_formatDate(_selectedDate)),
                          ),

                          const SizedBox(height: 20),

                          const Text(
                            'Preferred Time',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),

                          OutlinedButton.icon(
                            onPressed: _isSubmitting ? null : _selectTime,
                            icon: const Icon(Icons.access_time),
                            label: Text(_formatTime(_selectedTime)),
                          ),

                          const SizedBox(height: 20),

                          DropdownButtonFormField<String>(
                            initialValue: _selectedPriority,
                            decoration: const InputDecoration(
                              labelText: 'Priority',
                              border: OutlineInputBorder(),
                            ),
                            items: const [
                              DropdownMenuItem(
                                value: 'LOW',
                                child: Text('Low'),
                              ),
                              DropdownMenuItem(
                                value: 'MEDIUM',
                                child: Text('Medium'),
                              ),
                              DropdownMenuItem(
                                value: 'HIGH',
                                child: Text('High'),
                              ),
                            ],
                            onChanged: _isSubmitting
                                ? null
                                : (value) {
                                    if (value == null) return;

                                    setState(() {
                                      _selectedPriority = value;
                                    });
                                  },
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please select a priority';
                              }

                              return null;
                            },
                          ),

                          const SizedBox(height: 28),

                          FilledButton(
                            onPressed: _isSubmitting ? null : _submitRequest,
                            child: _isSubmitting
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Text('Submit Request'),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}
