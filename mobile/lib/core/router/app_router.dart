import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/data/profile_service.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/logout_screen.dart';
import '../../features/auth/presentation/registration_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import 'dart:async';
import '../../features/dashboard/presentation/customer_home_screen.dart';
import '../../features/services/presentation/services_screen.dart';
import '../../features/requests/presentation/create_request_screen.dart';
import '../../features/requests/presentation/my_requests_screen.dart';
import '../../features/requests/presentation/request_details_screen.dart';
import '../../features/auth/presentation/profile_screen.dart';
import '../../features/agent/presentation/agent_home_screen.dart';
import '../../features/agent/presentation/agent_requests_screen.dart';
import '../../features/agent/presentation/agent_request_details_screen.dart';
final ProfileService _profileService = ProfileService();

final GoRouter appRouter = GoRouter(
  initialLocation: '/splash',

  refreshListenable: GoRouterRefreshStream(
    Supabase.instance.client.auth.onAuthStateChange,
  ),

  redirect: (context, state) async {
    final supabase = Supabase.instance.client;

    final session = supabase.auth.currentSession;

    final location = state.matchedLocation;

    final isSplash = location == '/splash';
    final isLogin = location == '/login';
    final isRegistration = location == '/registration';
    final isForgotPassword = location == '/forgot-password';

    if (isSplash) {
      if (session == null) {
        return '/login';
      }

      final role = await _profileService.getCurrentUserRole();

      return _routeForRole(role);
    }

    if (session == null) {
      if (isLogin || isRegistration || isForgotPassword) {
        return null;
      }

      return '/login';
    }

    if (isLogin || isRegistration || isForgotPassword) {
      final role = await _profileService.getCurrentUserRole();

      return _routeForRole(role);
    }

    return null;
  },

  routes: [
    GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),

    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),

    GoRoute(
      path: '/registration',
      builder: (context, state) => const RegistrationScreen(),
    ),

    GoRoute(
      path: '/forgot-password',
      builder: (context, state) => const ForgotPasswordScreen(),
    ),

    GoRoute(path: '/logout', builder: (context, state) => const LogoutScreen()),

    GoRoute(
      path: '/home',
      builder: (context, state) => const CustomerHomeScreen(),
    ),

    GoRoute(
      path: '/agent',
      builder: (context, state) => const AgentHomeScreen(),
      routes: [
        GoRoute(
          path: 'requests',
          builder: (context, state) => const AgentRequestsScreen(),
        ),
        GoRoute(
          path: 'requests/:id',
          builder: (context, state) {
            final requestId = state.pathParameters['id'];

            if (requestId == null || requestId.isEmpty) {
              return const PlaceholderPage(title: 'Invalid Request');
            }

            return AgentRequestDetailsScreen(requestId: requestId);
          },
        ),
      ],
    ),

    GoRoute(
      path: '/admin',
      builder: (context, state) =>
          const PlaceholderPage(title: 'Admin Dashboard'),
    ),

   GoRoute(
      path: '/services',
      builder: (context, state) => const ServicesScreen(),
    ),

    GoRoute(
      path: '/create-request',
      builder: (context, state) => const CreateRequestScreen(),
    ),

    GoRoute(
      path: '/my-requests',
      builder: (context, state) => const MyRequestsScreen(),
    ),

    GoRoute(
      path: '/requests/:id',
      builder: (context, state) {
        final requestId = state.pathParameters['id'];

        if (requestId == null || requestId.isEmpty) {
          return const PlaceholderPage(title: 'Invalid Request');
        }

        return RequestDetailsScreen(requestId: requestId);
      },
    ),

    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
  ],
);

String _routeForRole(String? role) {
  switch (role) {
    case 'customer':
      return '/home';

    case 'agent':
      return '/agent';

    case 'admin':
      return '/admin';

    default:
      return '/login';
  }
}

class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();

    _subscription = stream.asBroadcastStream().listen((_) {
      notifyListeners();
    });
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

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
