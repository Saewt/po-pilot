
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from apps.api.serializers.users import (
    UserMeSerializer, 
    UserSerializer, 
    BulkStudentCreateSerializer,
    BulkStudentResultSerializer,
    BulkStudentDeleteSerializer
)
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
        - Create: Department Head or Admin
        - Update/Delete: Admin only
        """
        if self.action in ['list', 'retrieve', 'create', 'bulk_create_students','bulk_update_students','bulk_delete_students']:
            permission_classes = [IsDepartmentHead | IsAdminUser]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        if self.action == 'create':
             # Need to import inside method to avoid circular import if placed at top level with some patterns, 
             # though here it should be fine. But safer given the previous file structure.
             from apps.api.serializers.users import DepartmentMemberCreateSerializer
             return DepartmentMemberCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_department_head() and not user.is_staff:
            # Auto-assign to dept head's department
            serializer.save(department=user.department)
        else:
            serializer.save()

    
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

    @extend_schema(
        request=BulkStudentCreateSerializer,
        responses={201: BulkStudentResultSerializer},
        summary="Bulk create students",
        description="Department Head creates multiple students. Default password is FirstName+LastName (no spaces). Students must change password on first login.",
        tags=["users"]
    )
    @action(detail=False, methods=['post'], permission_classes=[IsDepartmentHead])
    def bulk_create_students(self, request):
        """
        Bulk create students for the department head's department.
        Password = FirstName + LastName (no spaces)
        must_change_password = True
        """
        serializer = BulkStudentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Validate department matches the department head's department
        request_department = serializer.validated_data['department'].strip()
        user_dept = request.user.department
        
        # Check if department matches by code or name (case-insensitive)
        if not (
            request_department.upper() == user_dept.code.upper() or
            request_department.lower() == user_dept.name.lower()
        ):
            return Response({
                "error": f"Department mismatch. You can only add students to your department: {user_dept.name} ({user_dept.code})"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Helper for password normalization
        def normalize_password(text):
            replacements = {
                'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
            }
            for tr, eng in replacements.items():
                text = text.replace(tr, eng)
            return text

        created_students = []
        with transaction.atomic():
            for student_data in serializer.validated_data['students']:
                # Normalize names (Title Case)
                first_name = student_data['first_name'].strip().title()
                last_name = student_data['last_name'].strip().title()
                
                # Password = Normalized(FirstName + LastName) (no spaces, English chars)
                raw_password = f"{first_name}{last_name}".replace(" ", "")
                password = normalize_password(raw_password)
                
                user = User.objects.create_user(
                    email=student_data['email'],
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    student_id=student_data['student_id'],
                    enrollment_year=student_data.get('enrollment_year'),
                    role="STUDENT",
                    department=request.user.department,
                    must_change_password=True
                )
                created_students.append({
                    "id": user.id,
                    "email": user.email,
                    "student_id": user.student_id,
                    "default_password": password  # Only returned once for admin reference
                })
        
        return Response({
            "created_count": len(created_students),
            "students": created_students
        }, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=BulkStudentDeleteSerializer,
        responses={200: {"type": "object", "properties": {"deleted_count": {"type": "integer"}, "message": {"type": "string"}}}},
        summary="Bulk delete students",
        description="Department Head deletes multiple students from their department. Students are permanently deleted.",
        tags=["users"]
    )
    @action(detail=False, methods=['post', 'delete'], permission_classes=[IsDepartmentHead])
    def bulk_delete_students(self, request):
        """
        Bulk delete students from the department head's department.
        Only students in the same department can be deleted.
        """
        serializer = BulkStudentDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        student_ids = serializer.validated_data['student_ids']
        
        with transaction.atomic():
            # Only delete students from the department head's department
            students_to_delete = User.objects.filter(
                student_id__in=student_ids,
                role="STUDENT",
                department=request.user.department
            )
            
            # Check if any students are not in the department
            found_ids = set(students_to_delete.values_list('student_id', flat=True))
            not_in_dept = set(student_ids) - found_ids
            
            if not_in_dept:
                return Response({
                    "error": f"Students not in your department: {list(not_in_dept)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            deleted_count = students_to_delete.count()
            students_to_delete.delete()
        
        return Response({
            "deleted_count": deleted_count,
            "message": f"Successfully deleted {deleted_count} students."
        })
