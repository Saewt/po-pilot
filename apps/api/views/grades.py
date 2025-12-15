from rest_framework.viewsets import ModelViewSet
from rest_framework import permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db import transaction
from drf_spectacular.utils import extend_schema

from apps.grades.models import AssessmentGrade
from apps.api.serializers.grades import (
    AssessmentGradeSerializer,
    AssessmentGradeDetailSerializer,
    BulkGradeCreateSerializer,
    BulkGradeUpdateSerializer,
)
from apps.api.permissions import IsDepartmentHead, IsInstructor, IsStudent

class GradeViewSet(ModelViewSet):
    """
    ViewSet for managing student grades.
    """
    queryset = AssessmentGrade.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AssessmentGradeDetailSerializer
        return AssessmentGradeSerializer

    def get_permissions(self):
        """
        Create/Update: Instructor of the course only.
        Read: Student (own), Instructor (course), Dept Head (dept).
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'bulk_create', 'bulk_update']:
            # Custom permission logic in perform_create/update or via custom permission class
            # For now using IsInstructor as base, specific check in methods
            permission_classes = [IsInstructor | IsDepartmentHead | IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Filter grades based on user role.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_department_head() or user.is_staff:
            return queryset
        
        if user.is_instructor():
            # Instructors see grades for their courses
            return queryset.filter(assessment__course_instance__instructor=user)
        
        if user.is_student():
            # Students see their own grades
            return queryset.filter(student=user)
            
        return queryset.none()

    def perform_create(self, serializer):
        """
        Validate that the instructor teaches the course for the assessment.
        """
        assessment = serializer.validated_data.get('assessment')
        user = self.request.user
        
        if not user.is_staff and assessment.course_instance.instructor != user:
            raise serializers.ValidationError("You can only enter grades for your own courses.")
            
        serializer.save(entered_by=user)

    def perform_update(self, serializer):
        """
        Validate that the instructor teaches the course for the assessment.
        """
        assessment = serializer.instance.assessment
        user = self.request.user
        
        if not user.is_staff and assessment.course_instance.instructor != user:
            raise serializers.ValidationError("You can only update grades for your own courses.")
            
        serializer.save()

    @extend_schema(
        request=BulkGradeCreateSerializer,
        responses={201: AssessmentGradeSerializer(many=True)},
        summary="Bulk create grades",
        description="Create multiple grades atomically. If any grade fails validation, the entire operation rolls back.",
        tags=["grades"]
    )
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create grades for an assessment.
        All grades are created atomically - if one fails, all fail.
        """
        serializer = BulkGradeCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            created = []
            for grade_data in serializer.validated_data['grades']:
                grade = AssessmentGrade.objects.create(
                    assessment=grade_data['assessment_id'],
                    student=grade_data['student_id'],
                    score=grade_data['score'],
                    entered_by=request.user
                )
                created.append(grade)
        
        return Response(
            AssessmentGradeSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        request=BulkGradeUpdateSerializer,
        responses={200: AssessmentGradeSerializer(many=True)},
        summary="Bulk update/upsert grades",
        description="Update or create multiple grades atomically. Uses upsert behavior - creates if not exists, updates if exists.",
        tags=["grades"]
    )
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        Bulk update/upsert grades for an assessment.
        Uses upsert behavior: creates new grades or updates existing ones.
        All operations are atomic - if one fails, all fail.
        """
        serializer = BulkGradeUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            updated = []
            for grade_data in serializer.validated_data['grades']:
                grade, _ = AssessmentGrade.objects.update_or_create(
                    assessment=grade_data['assessment_id'],
                    student=grade_data['student_id'],
                    defaults={
                        'score': grade_data['score'],
                        'entered_by': request.user
                    }
                )
                updated.append(grade)
        
        return Response(
            AssessmentGradeSerializer(updated, many=True).data,
            status=status.HTTP_200_OK
        )

