class RequestNoteModel {
  final String id;
  final String requestId;
  final String? authorId;
  final String note;
  final DateTime createdAt;
  final DateTime updatedAt;

  const RequestNoteModel({
    required this.id,
    required this.requestId,
    this.authorId,
    required this.note,
    required this.createdAt,
    required this.updatedAt,
  });

  factory RequestNoteModel.fromMap(Map<String, dynamic> map) {
    return RequestNoteModel(
      id: map['id'].toString(),
      requestId: map['request_id'].toString(),
      authorId: map['author_id']?.toString(),
      note: map['note'] as String,
      createdAt: DateTime.parse(map['created_at'] as String).toLocal(),
      updatedAt: DateTime.parse(map['updated_at'] as String).toLocal(),
    );
  }
}
