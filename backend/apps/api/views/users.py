
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
    BulkStudentDeleteSerializer,
    GPASerializer,
    StudentDashboardSerializer
)
from apps.api.permissions import IsDepartmentHead, IsStudent, IsInstructor
from apps.grades.calculators import AchievementCalculator
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
    Instructors can list and filter users in their department (for enrollment).
    Supports filtering by role and department query parameters.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['role', 'department', 'is_active']
    
    def get_permissions(self):
        """
        - List/Retrieve: Department Head, Instructor, or Admin
        - Create: Department Head or Admin
        - Update/Delete: Admin only
        - my_dashboard: Students only
        - gpa/gpa_history: Student (own), Department Head, Admin
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsDepartmentHead | IsInstructor | IsAdminUser]
        elif self.action in ['create', 'bulk_create_students', 'bulk_update_students', 'bulk_delete_students']:
            permission_classes = [IsDepartmentHead | IsAdminUser]
        elif self.action == 'my_dashboard':
            permission_classes = [IsStudent]
        elif self.action in ['gpa', 'gpa_history']:
            permission_classes = [IsStudent | IsDepartmentHead | IsAdminUser]
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
        
        # Department Heads and Instructors only see their own department's users
        if (user.is_department_head() or user.is_instructor()) and not user.is_staff:
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

    @extend_schema(
        responses={200: GPASerializer},
        summary="Get student GPA",
        description="Calculate current GPA from completed courses.",
        tags=["users"]
    )
    @action(detail=True, methods=['get'], permission_classes=[IsAdminUser | IsDepartmentHead | IsStudent])
    def gpa(self, request, pk=None):
        user = self.get_object()
        
        # Permission check: Student can view own, Dept Head/Admin can view any
        if request.user.is_student() and request.user != user:
             return Response({"detail": "You do not have permission to view this GPA."}, status=status.HTTP_403_FORBIDDEN)
             
        if not user.is_student():
             return Response({"detail": "User is not a student."}, status=status.HTTP_400_BAD_REQUEST)
             
        gpa_data = AchievementCalculator.calculate_student_gpa(user)
        serializer = GPASerializer(gpa_data)
        return Response(serializer.data)
        
    @extend_schema(
        responses={200: GPASerializer},
        summary="Get GPA history",
        description="Get GPA history over semesters (Not implemented yet, returns current GPA for now).",
        tags=["users"]
    )
    @action(detail=True, methods=['get'], url_path='gpa/history', permission_classes=[IsAdminUser | IsDepartmentHead | IsStudent])
    def gpa_history(self, request, pk=None):
        # Placeholder for history. 
        # For now, return current GPA.
        # Future: calculate cumulative GPA after each semester.
        return self.gpa(request, pk)

    @extend_schema(
        responses={200: StudentDashboardSerializer},
        summary="Get student dashboard",
        description="Get comprehensive student dashboard with GPA, courses, assessments, and PO achievement summary in a single call. Students can only access their own dashboard.",
        tags=["users"]
    )
    @action(detail=False, methods=['get'], url_path='my/dashboard', permission_classes=[IsStudent])
    def my_dashboard(self, request):
        """
        Get comprehensive student dashboard data in a single call.
        Only accessible by students for their own data.
        """
        student = request.user
        
        if not student.is_student():
            return Response({"detail": "Only students can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        
        # GPA calculation (completed courses only)
        gpa_data = AchievementCalculator.calculate_student_gpa(student)
        
        # Course counts
        active_courses = student.get_active_enrolled_courses().select_related('course_template', 'instructor')
        completed_courses = student.enrolled_courses.filter(is_active=False)
        
        # Calculate active credits and projected GPA
        active_credits = sum(course.course_template.credit for course in active_courses)
        
        # Calculate projected GPA (includes current courses with current grades)
        points_map = {
            "AA": 4.00, "BA": 3.50, "BB": 3.00, "CB": 2.50,
            "CC": 2.00, "DC": 1.50, "DD": 1.00, "FF": 0.00
        }
        
        projected_points = gpa_data['gpa'] * gpa_data['total_credits']  # Start with completed courses
        projected_credits = gpa_data['total_credits']
        
        for course in active_courses:
            grade_info = AchievementCalculator.calculate_final_course_grade(student, course)
            letter = grade_info['letter_grade']
            points = points_map.get(letter, 0.0)
            credit = course.course_template.credit
            projected_points += points * credit
            projected_credits += credit
        
        projected_gpa = round(projected_points / projected_credits, 2) if projected_credits > 0 else 0.0
        
        # Assessment counts
        from apps.courses.models import Assessment
        from apps.grades.models import AssessmentGrade
        
        total_assessments = Assessment.objects.filter(
            course_instance__in=active_courses
        ).count()
        
        graded_assessments = AssessmentGrade.objects.filter(
            student=student,
            assessment__course_instance__in=active_courses
        ).count()
        
        pending_assessments = total_assessments - graded_assessments
        
        # PO achievement summary
        po_results = AchievementCalculator.calculate_student_overall_po_achievements(student)
        overall_scores = [res.get('overall_achievement', 0) for res in po_results]
        average_po = round(sum(overall_scores) / len(overall_scores), 2) if overall_scores else None
        
        # Active courses list (simplified)
        active_course_list = [
            {
                "id": course.id,
                "name": course.course_template.name,
                "code": course.course_template.get_full_code(),
                "semester": course.semester,
                "year": course.year,
                "instructor": f"{course.instructor.first_name} {course.instructor.last_name}" if course.instructor else None
            }
            for course in active_courses
        ]
        
        # Recent grades (last 5)
        recent_grades_qs = AssessmentGrade.objects.filter(
            student=student
        ).select_related('assessment__course_instance__course_template').order_by('-created_at')[:5]
        
        recent_grades = [
            {
                "assessment_name": grade.assessment.name,
                "course_name": grade.assessment.course_instance.course_template.name,
                "score": float(grade.score),
                "max_score": float(grade.assessment.max_score),
                "entered_at": grade.created_at.isoformat() if grade.created_at else None
            }
            for grade in recent_grades_qs
        ]
        
        data = {
            "student_id": student.id,
            "student_number": student.student_id,
            "student_name": f"{student.first_name} {student.last_name}",
            "student_email": student.email,
            "department_name": student.department.name if student.department else "N/A",
            "department_code": student.department.code if student.department else "N/A",
            "class_year": student.class_year,
            "enrollment_year": student.enrollment_year,
            "official_gpa": gpa_data['gpa'],
            "current_gpa": projected_gpa,
            "earned_credits": gpa_data['total_credits'],
            "active_credits": active_credits,
            "total_courses": student.enrolled_courses.count(),
            "active_courses": active_courses.count(),
            "completed_courses": completed_courses.count(),
            "total_assessments": total_assessments,
            "graded_assessments": graded_assessments,
            "pending_assessments": pending_assessments,
            "average_po_achievement": average_po,
            "po_count": len(po_results),
            "active_course_list": active_course_list,
            "recent_grades": recent_grades,
        }
        
        serializer = StudentDashboardSerializer(data)
        return Response(serializer.data)

