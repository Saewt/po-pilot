from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from apps.api.permissions import IsDepartmentHead, IsInstructor, IsStudent

from apps.core.models import Department, ProgramOutcome
from apps.courses.models import LOtoPOContribution
from apps.api.serializers.core import (
    DepartmentWriteSerializer,
    DepartmentListSerializer,
    DepartmentDetailSerializer,
    ProgramOutcomeWriteSerializer,
    ProgramOutcomeListSerializer,
    ProgramOutcomeDetailSerializer,
    ProgramOutcomeLOSummarySerializer,
)
from apps.api.serializers.courses import (
    LOtoPOContributionWriteSerializer,
    LOtoPOContributionListSerializer,
    LOtoPOContributionDetailSerializer
)


class DepartmentViewSet(ModelViewSet):
    queryset = Department.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DepartmentWriteSerializer
        if self.action == 'retrieve':
            return DepartmentDetailSerializer
        return DepartmentListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('program_outcomes', 'course_templates', 'members').annotate(
                program_outcomes_count=Count('program_outcomes', distinct=True),
                active_program_outcomes_count=Count(
                    'program_outcomes',
                    filter=Q(program_outcomes__is_active=True),
                    distinct=True
                ),
                course_templates_count=Count('course_templates', distinct=True),
                # Standard count aggregations as requested
                members_student_count=Count('members', filter=Q(members__role="STUDENT"), distinct=True),
                members_instructor_count=Count('members', filter=Q(members__role="INSTRUCTOR"), distinct=True),
                members_head_count=Count('members', filter=Q(members__role="DEPARTMENT_HEAD"), distinct=True),
            )
        elif self.action == 'list':
             queryset = queryset.annotate(
                member_count=Count('members', distinct=True)
            )
        return queryset


class ProgramOutcomeViewSet(ModelViewSet):
    """
    ViewSet for Program Outcomes.
    """
    queryset = ProgramOutcome.objects.select_related('department').all()
    
    def get_permissions(self):
        """
        Read: All authenticated users
        Write: Department Heads and Admins only
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsDepartmentHead | IsAdminUser]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProgramOutcomeWriteSerializer
        if self.action == 'retrieve':
            return ProgramOutcomeDetailSerializer
        return ProgramOutcomeListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Security: Filter by user's department
        if self.request.user.is_authenticated and not self.request.user.is_superuser:
            # Check if department exists before filtering to avoid errors for users without department
             if self.request.user.department:
                queryset = queryset.filter(department=self.request.user.department)
            
        if self.action == 'retrieve':
            queryset = queryset.select_related('department', 'created_by').prefetch_related('lo_contributions').annotate(
                lo_contributions_total_count=Count('lo_contributions', distinct=True),
                lo_contributions_approved_count=Count(
                    'lo_contributions',
                    filter=Q(lo_contributions__is_approved=True),
                    distinct=True
                )
            )
        return queryset

    def perform_create(self, serializer):
        """Auto-assign department (safe-guard) and creator."""
        # Note: Serializer validation might run before this.
        # But we override strictly for security.
        serializer.save(
            department=self.request.user.department,
            created_by=self.request.user
        )

    @action(detail=True, methods=['get'])
    def lo_summary(self, request, pk=None):
        """
        Return a summary of all LOs contributing to this PO.
        """
        po = self.get_object()
        serializer = ProgramOutcomeLOSummarySerializer(po)
        return Response(serializer.data)


class LOToPOContributionViewSet(ModelViewSet):
    """
    ViewSet for LO to PO contributions and approvals.
    """
    queryset = LOtoPOContribution.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return LOtoPOContributionWriteSerializer
        if self.action in ['retrieve', 'approve']:
            return LOtoPOContributionDetailSerializer
        return LOtoPOContributionListSerializer

    def get_permissions(self):
        """
        Create/Update: Instructor/Dept Head.
        Approve: Dept Head only.
        Read: All authenticated.
        """
        if self.action in ['approve', 'reject']:
            permission_classes = [IsDepartmentHead | IsAdminUser]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsInstructor | IsDepartmentHead | IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Filter contributions.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_department_head() or user.is_staff:
            return queryset
            
        if user.is_instructor():
            # Instructors see contributions they created or for their courses
            return queryset.filter(learning_outcome__course_template__instances__instructor=user).distinct()
            
        return queryset

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve the contribution (Dept Head only).
        """
        contribution = self.get_object()
        user = request.user
        
        try:
            contribution.approve(user)
            serializer = self.get_serializer(contribution)
            return Response(serializer.data)
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject the contribution (Dept Head only).
        Sets is_approved=False and approved_by=User.
        """
        contribution = self.get_object()
        user = request.user
        
        if not user.is_department_head():
            return Response(
                {"detail": "Only department heads can reject LO-PO contributions."}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        consumption = contribution # Just alias
        contribution.is_approved = False
        contribution.approved_by = user
        contribution.approved_at = timezone.now()
        contribution.save()
        
        serializer = self.get_serializer(contribution)
        return Response(serializer.data)
