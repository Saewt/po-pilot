from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from apps.grades.calculators import AchievementCalculator
from apps.courses.models import CourseInstance
from apps.api.serializers.achievements import (
    StudentOverallReportSerializer,
    CourseAchievementSerializer,
    DepartmentStatisticsSerializer
)
from apps.api.serializers.courses import CourseLOAchievementSerializer
from apps.api.permissions import IsDepartmentHead, IsInstructor, IsStudent, IsCourseInstructor

User = get_user_model()

class AchievementViewSet(viewsets.GenericViewSet):
    """
    ViewSet for accessing achievement statistics and reports.
    Leverages the AchievementCalculator to compute real-time statistics.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # GenericViewSet needs a queryset or get_queryset for permissions/object lookups
        # but we are mostly calculating things on the fly.
        return User.objects.none()

    @extend_schema(
        summary="Get student's overall PO achievements",
        description="Returns comprehensive report of PO achievements across all courses for a student.",
        responses={200: StudentOverallReportSerializer},
        tags=["achievements"]
    )
    @action(detail=False, methods=['get'], url_path='student/(?P<student_id>[^/.]+)')
    def student_overall(self, request, student_id=None):
        student = None
        try:
            student = User.objects.get(student_id=student_id)
        except (User.DoesNotExist, ValueError):
            try:
                student = User.objects.get(pk=student_id)
            except (User.DoesNotExist, ValueError):
                pass

        # Permission Check
        has_permission = False
        if student:
            is_instructor_for_student = False
            if request.user.is_instructor():
                 is_instructor_for_student = CourseInstance.objects.filter(
                     instructor=request.user, 
                     students=student,
                     is_active=True
                 ).exists()

            if request.user == student or \
               (request.user.is_department_head() and request.user.department == student.department) or \
               request.user.is_staff or \
               is_instructor_for_student:
                has_permission = True
        
        # If not found, only admins get 404. Others get 403 to prevent enumeration.
        if not student:
            if request.user.is_staff or request.user.is_superuser:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        if not has_permission:
             return Response(
                {"detail": "You do not have permission to view this student's achievements."},
                status=status.HTTP_403_FORBIDDEN
            )

        # We need a method in calculator that returns the structure for StudentOverallReportSerializer
        # The existing calculate_student_overall_po_achievements returns a list of results.
        # We'll map that to the serializer structure.
        
        po_results = AchievementCalculator.calculate_student_overall_po_achievements(student)
        
        # Construct response matching StudentOverallReportSerializer
        data = {
            "student_id": student.id,
            "student_name": f"{student.first_name} {student.last_name}",
            "student_email": student.email,
            "student_number": student.student_id,
            "department_name": student.department.name if student.department else "N/A",
            "department_code": student.department.code if student.department else "N/A",
            "overall_po_achievements": [
                {
                    "po_id": res['program_outcome'].id,
                    "po_code": res['program_outcome'].code,
                    "po_full_code": res['program_outcome'].get_full_code(),
                    "po_description": res['program_outcome'].description,
                    "achievement_score": res.get('overall_achievement', 0),
                    "contribution_count": res.get('course_count', 0)
                } for res in po_results
            ],
            # Note: course_achievements details would require more calculation or a different calculator method
            "course_achievements": [], 
            "total_courses": student.enrolled_courses.count(),
            "active_courses": student.get_active_enrolled_courses().count(),
            # Placeholders for now until we add these counts to calculator
            "total_assessments": 0,
            "graded_assessments": 0,
        }
        
        serializer = StudentOverallReportSerializer(data)
        return Response(serializer.data)

    @extend_schema(
        summary="Get student's achievements for a specific course",
        description="Returns PO achievements for a specific student in a specific course instance.",
        responses={200: CourseAchievementSerializer},
        tags=["achievements"]
    )
    @action(detail=False, methods=['get'], url_path='student/(?P<student_id>[^/.]+)/course/(?P<course_instance_id>[^/.]+)')
    def student_course(self, request, student_id=None, course_instance_id=None):
        student = get_object_or_404(User, student_id=student_id)
        course_instance = get_object_or_404(CourseInstance, pk=course_instance_id)

        # Permission Check
        is_owner = request.user == student
        is_course_instructor = course_instance.instructor == request.user
        is_dept_head = request.user.is_department_head() and request.user.department == course_instance.course_template.department
        
        if not (is_owner or is_course_instructor or is_dept_head or request.user.is_staff):
             return Response(
                {"detail": "You do not have permission to view these achievements."},
                status=status.HTTP_403_FORBIDDEN
            )

        results = AchievementCalculator.calculate_all_po_achievement_for_course(student, course_instance)
        
        data = {
            "course_instance_id": course_instance.id,
            "course_name": course_instance.course_template.name,
            "course_code": course_instance.course_template.get_full_code(),
            "semester": course_instance.semester,
            "year": course_instance.year,
            "instructor_name": f"{course_instance.instructor.first_name} {course_instance.instructor.last_name}" if course_instance.instructor else None,
            "po_achievements": [
                {
                    "po_id": res['program_outcome'].id,
                    "po_code": res['program_outcome'].code,
                    "po_full_code": res['program_outcome'].get_full_code(),
                    "po_description": res['program_outcome'].description,
                    "achievement_score": res.get('achievement', 0),
                    "contribution_count": 1 # It's for this single course
                } for res in results
            ]
        }
        
        serializer = CourseAchievementSerializer(data)
        return Response(serializer.data)

    @extend_schema(
        summary="Get course LO statistics",
        description="Returns statistics for all Learning Outcomes in a course instance (avg/min/max).",
        responses={200: CourseLOAchievementSerializer(many=True)},
        tags=["achievements"]
    )
    @action(detail=False, methods=['get'], url_path='course/(?P<course_instance_id>[^/.]+)/lo')
    def course_lo(self, request, course_instance_id=None):
        course_instance = get_object_or_404(CourseInstance, pk=course_instance_id)

        # Permission Check
        is_course_instructor = course_instance.instructor == request.user
        is_dept_head = request.user.is_department_head() and request.user.department == course_instance.course_template.department
        
        if not (is_course_instructor or is_dept_head or request.user.is_staff):
             return Response(
                {"detail": "You do not have permission to view these statistics."},
                status=status.HTTP_403_FORBIDDEN
            )

        stats = AchievementCalculator.get_course_lo_statistics(course_instance)
        serializer = CourseLOAchievementSerializer(stats, many=True)
        return Response(serializer.data)
