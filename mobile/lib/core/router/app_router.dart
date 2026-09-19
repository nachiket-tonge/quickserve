import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/splash',
 routes: [
    GoRoute(
      path: '/splash',
      builder: (context, state) => const PlaceholderPage(title: 'Splash'),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const PlaceholderPage(title: 'Login'),
    ),
    GoRoute(
      path: '/registration',
      builder: (context, state) => const PlaceholderPage(title: 'Registration'),
    ),
    GoRoute(
      path: '/home',
      builder: (context, state) => const PlaceholderPage(title: 'Home'),
    ),
    GoRoute(
      path: '/services',
      builder: (context, state) => const PlaceholderPage(title: 'Services'),
    ),
    GoRoute(
      path: '/create-request',
      builder: (context, state) =>
          const PlaceholderPage(title: 'Create Request'),
    ),
    GoRoute(
      path: '/my-requests',
      builder: (context, state) => const PlaceholderPage(title: 'My Requests'),
    ),
    GoRoute(
      path: '/requests/:id',
      builder: (context, state) =>
          const PlaceholderPage(title: 'Request Details'),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const PlaceholderPage(title: 'Profile'),
    ),
    GoRoute(
      path: '/logout',
      builder: (context, state) => const PlaceholderPage(title: 'Logout'),
    ),
  ],
);

class PlaceholderPage extends StatelessWidget {
  final String title;

  const PlaceholderPage({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(child: Text(title, style: const TextStyle(fontSize: 24))),
    );
  }
}
