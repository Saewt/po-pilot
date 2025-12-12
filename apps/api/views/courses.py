from django.db.models import Count, Q
from rest_framework.viewsets import ModelViewSet
from rest_framework import permissions, serializers
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.api.permissions import IsDepartmentHead, IsInstructor, IsStudent, IsCourseInstructor

from apps.courses.models import CourseTemplate, CourseInstance, Assessment, LearningOutcome
from apps.api.serializers.courses import (
    CourseTemplateSerializer,
    CourseTemplateDetailSerializer,
    CourseInstanceSerializer,
    CourseInstanceDetailSerializer,
    AssessmentSerializer,
    AssessmentDetailSerializer,
    LearningOutcomeSerializer,
    LearningOutcomeDetailSerializer,
)


class LearningOutcomeViewSet(ModelViewSet):
    queryset = LearningOutcome.objects.select_related("course_template").all()
    
    def get_permissions(self):
        """
        Read: All authenticated users.
        Write: Department Heads and Admins only.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsDepartmentHead | IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LearningOutcomeDetailSerializer
        return LearningOutcomeSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('po_contributions', 'assessment_contributions')
        return queryset


class CourseTemplateViewSet(ModelViewSet):
    queryset = CourseTemplate.objects.all()
    
    def get_permissions(self):
        """
        Read: All authenticated users.
        Write: Department Heads and Admins only.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsDepartmentHead | IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseTemplateDetailSerializer
        return CourseTemplateSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'retrieve':
            queryset = queryset.select_related('department').prefetch_related(
                'learning_outcomes', 'instances'
            ).annotate(
                learning_outcomes_count=Count('learning_outcomes', distinct=True),
                instances_total_count=Count('instances', distinct=True),
                instances_active_count=Count(
                    'instances',
                    filter=Q(instances__is_active=True),
                    distinct=True
                ),
            )
        else:
            queryset = queryset.select_related('department')
        return queryset


class CourseInstanceViewSet(ModelViewSet):
    queryset = CourseInstance.objects.select_related("course_template").all()
    
    def get_permissions(self):
        """
        Create: Department Heads and Admins.
        Update/Delete: Instructor of the course, Dept Heads, Admins.
        Read: Authenticated (visibility filtered by queryset).
        """
        if self.action == 'create':
            permission_classes = [IsDepartmentHead | IsAdminUser]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [(IsInstructor & IsCourseInstructor) | IsDepartmentHead | IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseInstanceDetailSerializer
        return CourseInstanceSerializer

    def get_queryset(self):
        """
        Filter queryset based on user role to ensure they only see what they're allowed to.
        """
        queryset = super().get_queryset()
        user = self.request.user

        if user.is_department_head() or user.is_staff or user.is_superuser:
            pass
        elif user.is_instructor():
            queryset = queryset.filter(instructor=user)
        elif user.is_student():
            queryset = queryset.filter(students=user)
        else:
            queryset = queryset.none()

        if self.action == 'retrieve':
            queryset = queryset.select_related(
                'course_template', 'instructor'
            ).prefetch_related(
                'students', 'assessments'
            ).annotate(
                students_count=Count('students', distinct=True),
                assessments_count=Count('assessments', distinct=True),
            )
        else:
            queryset = queryset.select_related('course_template', 'instructor')
        return queryset


class AssessmentViewSet(ModelViewSet):
    """
    ViewSet for managing course assessments (Midterms, Finals, etc.).
    """
    queryset = Assessment.objects.select_related("course_instance").all()
    
    def get_permissions(self):
        """
        Create/Update: Instructor of the course, Dept Heads, Admins.
        Read: Instructors, Dept Heads, Enrolled Students.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [(IsInstructor & IsCourseInstructor) | IsDepartmentHead | IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AssessmentDetailSerializer
        return AssessmentSerializer

    def get_queryset(self):
        """
        Filter assessments based on user role.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_department_head() or user.is_staff:
            return queryset
        
        if user.is_instructor():
            return queryset.filter(course_instance__instructor=user)
        
        if user.is_student():
            return queryset.filter(course_instance__students=user)
            
        return queryset.none()

    def perform_create(self, serializer):
        """Validate course instructor for assessment creation."""
        course_instance = serializer.validated_data.get('course_instance')
        user = self.request.user
        
        if user.is_instructor() and course_instance.instructor != user:
            raise serializers.ValidationError("You can only create assessments for your own courses.")
            
        serializer.save()
