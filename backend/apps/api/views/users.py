
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django_filters.rest_framework import DjangoFilterBackend

from apps.api.serializers.users import UserMeSerializer, UserSerializer
from apps.api.permissions import IsDepartmentHead
from apps.users.models import User

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get Current User Information",
        description="Retrieve the currently authenticated user's profile information including department and active courses.",
        responses={200: UserMeSerializer},
        tags=["users"]
    )
    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)


class UserViewSet(ModelViewSet):
    """
    ViewSet for listing and managing users.
    
    Department Heads can list and filter users in their department.
    Supports filtering by role and department query parameters.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['role', 'department', 'is_active']
    
    def get_permissions(self):
        """
        - List/Retrieve: Department Head or Admin
        - Create/Update/Delete: Admin only
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsDepartmentHead | IsAdminUser]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter queryset based on user role and query params."""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Department Heads only see their own department's users
        if user.is_department_head() and not user.is_staff:
            queryset = queryset.filter(department=user.department)
        
        return queryset.select_related('department')
    
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='role',
                description='Filter by user role (INSTRUCTOR, STUDENT, DEPARTMENT_HEAD)',
                required=False,
                type=str
            ),
            OpenApiParameter(
                name='department',
                description='Filter by department ID',
                required=False,
                type=int
            ),
        ],
        tags=["users"]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
