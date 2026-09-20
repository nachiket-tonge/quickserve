class ServiceRequestModel {
  final String id;
  final String requestNumber;
  final String customerId;
  final String? agentId;
  final String serviceId;
  final String? serviceName;
  final String status;
  final String? description;
  final DateTime? preferredDatetime;
  final String? address;
  final String? priority;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ServiceRequestModel({
    required this.id,
    required this.requestNumber,
    required this.customerId,
    this.agentId,
    required this.serviceId,
    this.serviceName,
    required this.status,
    this.description,
    this.preferredDatetime,
    this.address,
    this.priority,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ServiceRequestModel.fromMap(Map<String, dynamic> map) {
    final service = map['services'] as Map<String, dynamic>?;

    return ServiceRequestModel(
      id: map['id'].toString(),
      requestNumber: map['request_number'] as String,
      customerId: map['customer_id'].toString(),
      agentId: map['agent_id']?.toString(),
      serviceId: map['service_id'].toString(),
      serviceName: service?['name'] as String?,
      status: map['status'] as String,
      description: map['description'] as String?,
      preferredDatetime: map['preferred_datetime'] != null
          ? DateTime.parse(map['preferred_datetime'] as String).toLocal()
          : null,
      address: map['address'] as String?,
      priority: map['priority'] as String?,
      createdAt: DateTime.parse(map['created_at'] as String).toLocal(),
      updatedAt: DateTime.parse(map['updated_at'] as String).toLocal(),
    );
  }
}
