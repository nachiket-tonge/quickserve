class ServiceModel {
  final String id;
  final String name;
  final String? description;

  const ServiceModel({required this.id, required this.name, this.description});

  factory ServiceModel.fromMap(Map<String, dynamic> map) {
    return ServiceModel(
      id: map['id'].toString(),
      name: map['name'] as String,
      description: map['description'] as String?,
    );
  }
}
