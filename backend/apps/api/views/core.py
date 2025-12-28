from rest_framework import permissions, serializers
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from drf_spectacular.utils import extend_schema, OpenApiParameter
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
    LOtoPOContributionDetailSerializer,
    LOtoPOApprovalActionSerializer
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
                    filter=Q(lo_contributions__approval_status='APPROVED'),
                    distinct=True
                ),
                lo_contributions_pending_count=Count(
                    'lo_contributions',
                    filter=Q(lo_contributions__approval_status='PENDING'),
                    distinct=True
                ),
                lo_contributions_declined_count=Count(
                    'lo_contributions',
                    filter=Q(lo_contributions__approval_status='DECLINED'),
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

    @extend_schema(
        parameters=[
            OpenApiParameter(name='learning_outcome_id', description='Filter by Learning Outcome ID', required=False, type=int),
            OpenApiParameter(name='program_outcome_id', description='Filter by Program Outcome ID', required=False, type=int),
            OpenApiParameter(name='approval_status', description='Filter by approval status (PENDING/APPROVED/DECLINED)', required=False, type=str),
            OpenApiParameter(name='course_template_id', description='Filter by Course Template ID', required=False, type=int),
            OpenApiParameter(name='show_declined', description='Show declined items (for department head override)', required=False, type=bool),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        """
        Filter contributions by query parameters and user role.
        """
        queryset = super().get_queryset().select_related(
            'learning_outcome', 'learning_outcome__course_template',
            'program_outcome', 'program_outcome__department',
            'approved_by'
        )
        user = self.request.user
        
        # Query parameter filters
        learning_outcome_id = self.request.query_params.get('learning_outcome_id')
        if learning_outcome_id:
            queryset = queryset.filter(learning_outcome_id=learning_outcome_id)
        
        program_outcome_id = self.request.query_params.get('program_outcome_id')
        if program_outcome_id:
            queryset = queryset.filter(program_outcome_id=program_outcome_id)
        
        approval_status_param = self.request.query_params.get('approval_status')
        if approval_status_param:
            queryset = queryset.filter(approval_status=approval_status_param.upper())
        
        # Backward compatibility for is_approved parameter
        is_approved_param = self.request.query_params.get('is_approved')
        if is_approved_param is not None:
            is_approved = is_approved_param.lower() in ['true', '1', 'yes']
            if is_approved:
                queryset = queryset.filter(approval_status='APPROVED')
            else:
                queryset = queryset.filter(approval_status__in=['PENDING', 'DECLINED'])
        
        course_template_id = self.request.query_params.get('course_template_id')
        if course_template_id:
            queryset = queryset.filter(learning_outcome__course_template_id=course_template_id)
        
        # Department head override: show declined items
        show_declined_param = self.request.query_params.get('show_declined')
        if show_declined_param and show_declined_param.lower() in ['true', '1', 'yes']:
            if user.is_department_head():
                # Department heads can see all items including declined
                pass
            else:
                # Non-department heads cannot see declined items
                queryset = queryset.exclude(approval_status='DECLINED')
        else:
            # Default behavior: hide declined items for non-department heads
            if not user.is_department_head() and not user.is_staff:
                queryset = queryset.exclude(approval_status='DECLINED')
        
        # Role-based filtering
        if user.is_department_head() or user.is_staff:
            return queryset
            
        if user.is_instructor():
            # Instructors see contributions they created or for their courses
            return queryset.filter(learning_outcome__course_template__instances__instructor=user).distinct()
            
        return queryset

    def perform_create(self, serializer):
        """Validate that instructor teaches the course for this LO contribution."""
        user = self.request.user
        learning_outcome = serializer.validated_data.get('learning_outcome')
        
        if user.is_instructor():
            # Check if instructor teaches any instance of this course template
            has_access = learning_outcome.course_template.instances.filter(instructor=user).exists()
            if not has_access:
                raise serializers.ValidationError(
                    "You can only create contributions for courses you teach."
                )
        
        serializer.save()

    @extend_schema(
        request=LOtoPOApprovalActionSerializer,
        responses={200: LOtoPOContributionDetailSerializer},
        summary="Perform approval action on LO-PO contribution",
        description="Approve, decline, or reset to pending a LO-PO contribution. Department heads only.",
        tags=["lo-po-contributions"]
    )
    @action(detail=True, methods=['post'])
    def approval_action(self, request, pk=None):
        """
        Perform approval action (approve/decline/reset) on the contribution.
        Department heads only.
        """
        contribution = self.get_object()
        user = request.user
        
        serializer = LOtoPOApprovalActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        reason = serializer.validated_data.get('reason')
        
        try:
            if action == 'approve':
                contribution.approve(user)
            elif action == 'decline':
                contribution.decline(user, reason)
            elif action == 'reset_to_pending':
                contribution.reset_to_pending(user)
            else:
                return Response(
                    {"detail": f"Invalid action: {action}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            response_serializer = LOtoPOContributionDetailSerializer(contribution)
            return Response(response_serializer.data)
            
        except PermissionError as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)

    @extend_schema(
        responses={200: LOtoPOContributionListSerializer(many=True)},
        summary="Get declined contributions",
        description="List all declined LO-PO contributions for department head review.",
        tags=["lo-po-contributions"]
    )
    @action(detail=False, methods=['get'], permission_classes=[IsDepartmentHead | IsAdminUser])
    def declined(self, request):
        """
        List all declined contributions for department head review.
        """
        queryset = self.get_queryset().filter(approval_status='DECLINED')
        serializer = LOtoPOContributionListSerializer(queryset, many=True)
        return Response(serializer.data)
