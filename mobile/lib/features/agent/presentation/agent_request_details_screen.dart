import 'package:flutter/material.dart';

import '../data/agent_repository.dart';
import '../models/request_note_model.dart';
import '../../requests/models/service_request_model.dart';

class AgentRequestDetailsScreen extends StatefulWidget {
  final String requestId;

  const AgentRequestDetailsScreen({super.key, required this.requestId});

  @override
  State<AgentRequestDetailsScreen> createState() =>
      _AgentRequestDetailsScreenState();
}

class _AgentRequestDetailsScreenState extends State<AgentRequestDetailsScreen> {
  final AgentRepository _repository = AgentRepository();
  final TextEditingController _noteController = TextEditingController();

  late Future<ServiceRequestModel> _requestFuture;
  late Future<List<RequestNoteModel>> _notesFuture;

  bool _isUpdatingStatus = false;
  bool _isAddingNote = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  void _loadData() {
    _requestFuture = _repository.getAssignedRequestById(widget.requestId);

    _notesFuture = _repository.getRequestNotes(widget.requestId);
  }

  Future<void> _refresh() async {
    setState(() {
      _loadData();
    });

    await Future.wait([_requestFuture, _notesFuture]);
  }

  Future<void> _updateStatus({
    required String newStatus,
    required String actionLabel,
  }) async {
    final confirmed = await _showConfirmationDialog(
      title: actionLabel,
      message:
          'Are you sure you want to change this request to '
          '${newStatus.replaceAll('_', ' ')}?',
    );

    if (!confirmed || !mounted) {
      return;
    }

    setState(() {
      _isUpdatingStatus = true;
    });

    try {
      await _repository.updateRequestStatus(
        requestId: widget.requestId,
        newStatus: newStatus,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _loadData();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Request status updated to '
            '${newStatus.replaceAll('_', ' ')}.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to update request status: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isUpdatingStatus = false;
        });
      }
    }
  }

  Future<bool> _showConfirmationDialog({
    required String title,
    required String message,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(false);
              },
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop(true);
              },
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  Future<void> _addNote() async {
    final note = _noteController.text.trim();

    if (note.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Please enter a note.')));
      return;
    }

    setState(() {
      _isAddingNote = true;
    });

    try {
      await _repository.addRequestNote(requestId: widget.requestId, note: note);

      if (!mounted) {
        return;
      }

      _noteController.clear();

      setState(() {
        _notesFuture = _repository.getRequestNotes(widget.requestId);
      });

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Note added successfully.')));
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Unable to add note: $error')));
    } finally {
      if (mounted) {
        setState(() {
          _isAddingNote = false;
        });
      }
    }
  }

  Widget _buildStatusActions(ServiceRequestModel request) {
    if (_isUpdatingStatus) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    switch (request.status) {
      case 'ASSIGNED':
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              _updateStatus(
                newStatus: 'IN_PROGRESS',
                actionLabel: 'Start Work',
              );
            },
            icon: const Icon(Icons.play_arrow),
            label: const Text('Start Work'),
          ),
        );

      case 'IN_PROGRESS':
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              _updateStatus(
                newStatus: 'COMPLETED',
                actionLabel: 'Complete Request',
              );
            },
            icon: const Icon(Icons.check),
            label: const Text('Complete Request'),
          ),
        );

      case 'COMPLETED':
        return const _StatusMessage(
          icon: Icons.check_circle,
          message: 'This request has been completed.',
        );

      case 'CANCELLED':
        return const _StatusMessage(
          icon: Icons.cancel_outlined,
          message: 'This request has been cancelled.',
        );

      case 'NEW':
        return const _StatusMessage(
          icon: Icons.info_outline,
          message: 'This request has not been assigned yet.',
        );

      default:
        return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Request Details')),
      body: FutureBuilder<ServiceRequestModel>(
        future: _requestFuture,
        builder: (context, requestSnapshot) {
          if (requestSnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (requestSnapshot.hasError) {
            return _ErrorView(
              message: requestSnapshot.error.toString(),
              onRetry: () {
                setState(() {
                  _loadData();
                });
              },
            );
          }

          final request = requestSnapshot.data;

          if (request == null) {
            return const Center(child: Text('Request not found.'));
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                _RequestHeader(request: request),

                const SizedBox(height: 20),

                _SectionCard(
                  title: 'Request Information',
                  children: [
                    _InfoRow(
                      icon: Icons.miscellaneous_services_outlined,
                      label: 'Service',
                      value: request.serviceName ?? 'Unknown service',
                    ),
                    _InfoRow(
                      icon: Icons.flag_outlined,
                      label: 'Priority',
                      value: request.priority ?? 'Not specified',
                    ),
                    _InfoRow(
                      icon: Icons.calendar_today_outlined,
                      label: 'Preferred Date',
                      value: request.preferredDatetime != null
                          ? _formatDateTime(request.preferredDatetime!)
                          : 'Not specified',
                    ),
                    _InfoRow(
                      icon: Icons.location_on_outlined,
                      label: 'Address',
                      value: request.address ?? 'Not specified',
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                _SectionCard(
                  title: 'Description',
                  children: [
                    Text(
                      request.description?.trim().isNotEmpty == true
                          ? request.description!
                          : 'No description provided.',
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                _SectionCard(
                  title: 'Status',
                  children: [
                    _StatusDisplay(status: request.status),
                    const SizedBox(height: 16),
                    _buildStatusActions(request),
                  ],
                ),

                const SizedBox(height: 16),

                _NotesSection(
                  notesFuture: _notesFuture,
                  controller: _noteController,
                  isAddingNote: _isAddingNote,
                  onAddNote: _addNote,
                ),

                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _RequestHeader extends StatelessWidget {
  final ServiceRequestModel request;

  const _RequestHeader({required this.request});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              request.requestNumber,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              request.serviceName ?? 'Service Request',
              style: TextStyle(fontSize: 16, color: Colors.grey.shade700),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SectionCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 3),
                Text(value),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusDisplay extends StatelessWidget {
  final String status;

  const _StatusDisplay({required this.status});

  @override
  Widget build(BuildContext context) {
    final statusData = _statusData(status);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: statusData.color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(statusData.icon, color: statusData.color),
          const SizedBox(width: 10),
          Text(
            status.replaceAll('_', ' '),
            style: TextStyle(
              color: statusData.color,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusMessage extends StatelessWidget {
  final IconData icon;
  final String message;

  const _StatusMessage({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const SizedBox(width: 4),
        Icon(icon),
        const SizedBox(width: 10),
        Expanded(child: Text(message)),
      ],
    );
  }
}

class _NotesSection extends StatelessWidget {
  final Future<List<RequestNoteModel>> notesFuture;
  final TextEditingController controller;
  final bool isAddingNote;
  final VoidCallback onAddNote;

  const _NotesSection({
    required this.notesFuture,
    required this.controller,
    required this.isAddingNote,
    required this.onAddNote,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Request Notes',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),

            const SizedBox(height: 16),

            FutureBuilder<List<RequestNoteModel>>(
              future: notesFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }

                if (snapshot.hasError) {
                  return Text('Unable to load notes: ${snapshot.error}');
                }

                final notes = snapshot.data ?? [];

                if (notes.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text('No notes have been added yet.'),
                  );
                }

                return Column(
                  children: [
                    ...notes.map((note) => _NoteItem(note: note)),
                    const SizedBox(height: 16),
                  ],
                );
              },
            ),

            TextField(
              controller: controller,
              maxLines: 4,
              maxLength: 500,
              textInputAction: TextInputAction.newline,
              decoration: const InputDecoration(
                labelText: 'Add a note',
                hintText: 'Enter an internal note...',
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 12),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: isAddingNote ? null : onAddNote,
                icon: isAddingNote
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.add),
                label: Text(isAddingNote ? 'Adding...' : 'Add Note'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoteItem extends StatelessWidget {
  final RequestNoteModel note;

  const _NoteItem({required this.note});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(note.note),
          const SizedBox(height: 8),
          Text(
            _formatDateTime(note.createdAt),
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: 12),
            const Text(
              'Unable to load request.',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class _StatusData {
  final Color color;
  final IconData icon;

  const _StatusData({required this.color, required this.icon});
}

_StatusData _statusData(String status) {
  switch (status) {
    case 'ASSIGNED':
      return const _StatusData(
        color: Colors.orange,
        icon: Icons.assignment_outlined,
      );

    case 'IN_PROGRESS':
      return const _StatusData(color: Colors.blue, icon: Icons.pending_actions);

    case 'COMPLETED':
      return const _StatusData(
        color: Colors.green,
        icon: Icons.check_circle_outline,
      );

    case 'CANCELLED':
      return const _StatusData(color: Colors.red, icon: Icons.cancel_outlined);

    case 'NEW':
      return const _StatusData(
        color: Colors.grey,
        icon: Icons.fiber_new_outlined,
      );

    default:
      return const _StatusData(color: Colors.grey, icon: Icons.help_outline);
  }
}

String _formatDateTime(DateTime dateTime) {
  final local = dateTime.toLocal();

  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  final year = local.year.toString();

  final hour = local.hour == 0
      ? 12
      : local.hour > 12
      ? local.hour - 12
      : local.hour;

  final minute = local.minute.toString().padLeft(2, '0');

  final period = local.hour >= 12 ? 'PM' : 'AM';

  return '$day/$month/$year, $hour:$minute $period';
}
