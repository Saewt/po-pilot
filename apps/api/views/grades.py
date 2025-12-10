from rest_framework.viewsets import ModelViewSet
from rest_framework import permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from apps.grades.models import AssessmentGrade
from apps.api.serializers.grades import (
    AssessmentGradeSerializer,
    AssessmentGradeDetailSerializer,
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
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Custom permission logic in perform_create/update or via custom permission class
            # For now using IsInstructor as base, specific check in methods
            permission_classes = [IsInstructor | IsAdminUser]
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
