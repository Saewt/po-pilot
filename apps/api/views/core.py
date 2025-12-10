from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from apps.api.permissions import IsDepartmentHead, IsInstructor, IsStudent

from apps.core.models import Department, ProgramOutcome
from apps.courses.models import LOtoPOContribution
from apps.api.serializers.core import (
    DepartmentSerializer,
    DepartmentDetailSerializer,
    ProgramOutcomeSerializer,
    ProgramOutcomeDetailSerializer,
)
from apps.api.serializers.courses import LOtoPOContributionSerializer, LOtoPOContributionDetailSerializer


class DepartmentViewSet(ModelViewSet):
    queryset = Department.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DepartmentDetailSerializer
        return DepartmentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('programs', 'course_templates').annotate(
                programs_count=Count('programs', distinct=True),
                course_templates_count=Count('course_templates', distinct=True),
            )
        return queryset


class ProgramOutcomeViewSet(ModelViewSet):
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
        if self.action == 'retrieve':
            return ProgramOutcomeDetailSerializer
        return ProgramOutcomeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('lo_contributions').annotate(
                lo_contributions_total_count=Count('lo_contributions', distinct=True),
                lo_contributions_approved_count=Count(
                    'lo_contributions',
                    filter=Q(lo_contributions__is_approved=True),
                    distinct=True
                )
            )
        return queryset


class LOToPOContributionViewSet(ModelViewSet):
    """
    ViewSet for LO to PO contributions and approvals.
    """
    queryset = LOtoPOContribution.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['retrieve', 'approve']:
            return LOtoPOContributionDetailSerializer
        return LOtoPOContributionSerializer

    def get_permissions(self):
        """
        Create/Update: Instructor/Dept Head.
        Approve: Dept Head only.
        Read: All authenticated.
        """
        if self.action == 'approve':
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
