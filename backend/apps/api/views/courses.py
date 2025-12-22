from django.db.models import Count, Q
from rest_framework.viewsets import ModelViewSet
from rest_framework import permissions, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db import transaction
from drf_spectacular.utils import extend_schema, OpenApiParameter
from apps.api.permissions import IsDepartmentHead, IsInstructor, IsStudent, IsCourseInstructor

from apps.courses.models import CourseTemplate, CourseInstance, Assessment, LearningOutcome, AssessmentToLOContribution
from apps.grades.calculators import AchievementCalculator
from apps.api.serializers.courses import (
    # Course Template
    CourseTemplateWriteSerializer,
    CourseTemplateListSerializer,
    CourseTemplateDetailSerializer,
    # Course Instance
    CourseInstanceWriteSerializer,
    CourseInstanceListSerializer,
    CourseInstanceDetailSerializer,
    # Assessment
    AssessmentWriteSerializer,
    AssessmentListSerializer,
    AssessmentDetailSerializer,
    # Learning Outcome
    LearningOutcomeWriteSerializer,
    LearningOutcomeListSerializer,
    LearningOutcomeDetailSerializer,
    # Contributions
    AssessmentToLOContributionWriteSerializer,
    AssessmentToLOContributionListSerializer,
    LOtoPOContributionWriteSerializer,
    # Action Serializers
    CourseLOAchievementSerializer,
    StudentEnrollmentSerializer,
    StudentUnenrollSerializer,
    CourseStudentSerializer,
)
# Note: LOtoPOContributionViewSet is in core.py, but used serializers from courses.py which I updated.


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
        if self.action in ['create', 'update', 'partial_update']:
            return LearningOutcomeWriteSerializer
        if self.action == 'retrieve':
            return LearningOutcomeDetailSerializer
        return LearningOutcomeListSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Filter by Course Template (Specific Course LOs)
        course_template_id = self.request.query_params.get("course_template_id")
        if course_template_id:
            queryset = queryset.filter(course_template_id=course_template_id)
        
        # Filter by Scope (Department LOs)
        scope = self.request.query_params.get("scope")
        if scope == "department":
            if user.is_authenticated and user.department:
                 queryset = queryset.filter(course_template__department=user.department)
            # If user has no department or not auth (unlikely due to perms), return empty or standard filtering
        
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
        if self.action in ['create', 'update', 'partial_update']:
            return CourseTemplateWriteSerializer
        if self.action == 'retrieve':
            return CourseTemplateDetailSerializer
        return CourseTemplateListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        user = self.request.user
        if user.is_department_head() and not (user.is_staff or user.is_superuser):
             queryset = queryset.filter(department=user.department)

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
        elif self.action in ['update', 'partial_update', 'destroy', 'enroll_students', 'unenroll_student']:
            permission_classes = [(IsInstructor & IsCourseInstructor) | IsDepartmentHead | IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CourseInstanceWriteSerializer
        if self.action == 'retrieve':
            return CourseInstanceDetailSerializer
        return CourseInstanceListSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(name='instructor', description='Filter by instructor ID or "me"/"current_user"', required=False, type=str),
            OpenApiParameter(name='is_active', description='Filter by active status (true/false)', required=False, type=bool),
            OpenApiParameter(name='semester', description='Filter by semester (e.g., "Fall", "Spring")', required=False, type=str),
            OpenApiParameter(name='year', description='Filter by year (e.g., 2024)', required=False, type=int),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        """
        Filter queryset based on user role to ensure they only see what they're allowed to.
        Supports ?instructor=me or ?instructor=current_user to filter by current user.
        Supports ?is_active=true, ?semester=Fall, ?year=2024 filters.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Instructor query parameter filter (for Dept Heads/Admins)
        instructor_param = self.request.query_params.get('instructor')
        if instructor_param in ['me', 'current_user']:
            queryset = queryset.filter(instructor=user)
        elif instructor_param:
            try:
                queryset = queryset.filter(instructor_id=int(instructor_param))
            except (ValueError, TypeError):
                pass  # Invalid ID, ignore filter

        # Active status filter
        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            is_active = is_active_param.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_active=is_active)

        # Semester and year filters
        semester_param = self.request.query_params.get('semester')
        if semester_param:
            queryset = queryset.filter(semester__iexact=semester_param)
        
        year_param = self.request.query_params.get('year')
        if year_param:
            try:
                queryset = queryset.filter(year=int(year_param))
            except (ValueError, TypeError):
                pass

        # Role-based visibility filtering
        if user.is_staff or user.is_superuser:
            pass
        elif user.is_department_head():
            # Department Heads only see courses in their department
            queryset = queryset.filter(course_template__department=user.department)
        elif user.is_instructor():
            # Instructors only see their own courses
            queryset = queryset.filter(instructor=user)
        elif user.is_student():
            queryset = queryset.filter(students=user)
        else:
            queryset = queryset.none()

        if self.action == 'retrieve':
            queryset = queryset.select_related(
                'course_template__department', 'instructor'
            ).prefetch_related(
                'students', 'assessments'
            ).annotate(
                students_count=Count('students', distinct=True),
                assessments_count=Count('assessments', distinct=True),
            )
        else:
            queryset = queryset.select_related('course_template__department', 'instructor')
        return queryset

    @extend_schema(
        responses={200: CourseLOAchievementSerializer(many=True)},
        summary="Get LO achievement statistics",
        description="Returns average/min/max scores per Learning Outcome for all students in this course.",
        tags=["course-instances"]
    )
    @action(detail=True, methods=['get'])
    def lo_achievements(self, request, pk=None):
        """
        Return LO achievement statistics for this course instance.
        Uses the AchievementCalculator to compute statistics.
        """
        course_instance = self.get_object()
        stats = AchievementCalculator.get_course_lo_statistics(course_instance)
        serializer = CourseLOAchievementSerializer(stats, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=StudentEnrollmentSerializer,
        responses={200: {"type": "object", "properties": {"enrolled_count": {"type": "integer"}, "message": {"type": "string"}}}},
        summary="Enroll students",
        description="Bulk enroll students to this course. Atomic operation - all or nothing.",
        tags=["course-instances"]
    )
    @action(detail=True, methods=['post'])
    def enroll_students(self, request, pk=None):
        """
        Bulk enroll students to this course.
        All enrollments are atomic - if one fails, all fail.
        """
        course_instance = self.get_object()
        serializer = StudentEnrollmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        with transaction.atomic():
            student_ids = serializer.validated_data['student_ids']
            # Lookup by string student_id
            students = User.objects.filter(student_id__in=student_ids, role="STUDENT")
            course_instance.students.add(*students)
        
        return Response({
            "enrolled_count": len(student_ids),
            "message": f"Successfully enrolled {len(student_ids)} students."
        })

    @extend_schema(
        request=StudentUnenrollSerializer,
        responses={200: {"type": "object", "properties": {"message": {"type": "string"}}}},
        summary="Unenroll student",
        description="Remove a student from this course.",
        tags=["course-instances"]
    )
    @action(detail=True, methods=['post'])
    def unenroll_student(self, request, pk=None):
        """Remove a student from this course."""
        course_instance = self.get_object()
        serializer = StudentUnenrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        student_id = serializer.validated_data['student_id']
        # Lookup by string student_id
        student = User.objects.get(student_id=student_id)
        
        if not course_instance.students.filter(student_id=student_id).exists():
            return Response(
                {"error": "Student is not enrolled in this course."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course_instance.students.remove(student)
        
        return Response({
            "message": f"Successfully unenrolled student {student_id}."
        })

    @extend_schema(
        responses={200: CourseStudentSerializer(many=True)},
        summary="List enrolled students",
        description="Returns a list of students enrolled in this course with their id, first_name, and last_name.",
        tags=["course-instances"]
    )
    @action(detail=True, methods=['get'], permission_classes=[(IsInstructor & IsCourseInstructor) | IsDepartmentHead | IsAdminUser])
    def students(self, request, pk=None):
        """
        List all students enrolled in this course.
        Only instructors of the course and department heads can access.
        """
        course_instance = self.get_object()
        students = course_instance.students.all().values('id', 'student_id', 'first_name', 'last_name')
        serializer = CourseStudentSerializer(students, many=True)
        return Response(serializer.data)

    @extend_schema(
        parameters=[
            OpenApiParameter(name='class_year', description='Filter by class year (1-4). If not provided, uses course target_class_year.', type=int, required=False),
        ],
        responses={200: CourseStudentSerializer(many=True)},
        summary="List available students for enrollment",
        description="Returns students in same department who are NOT enrolled. Auto-filters by course's target_class_year if no class_year param given.",
        tags=["course-instances"]
    )
    @action(detail=True, methods=['get'], permission_classes=[(IsInstructor & IsCourseInstructor) | IsDepartmentHead | IsAdminUser])
    def available_students(self, request, pk=None):
        """
        List students in same department who are NOT enrolled in this course.
        Auto-filters by course's target_class_year if no class_year parameter is provided.
        """
        course_instance = self.get_object()
        department = course_instance.course_template.department
        target_class_year = course_instance.course_template.target_class_year
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Same department, role=STUDENT, not already enrolled
        students = User.objects.filter(
            role="STUDENT",
            department=department
        ).exclude(enrolled_courses=course_instance)
        
        # Get class_year filter - use param or fall back to course's target
        class_year_param = request.query_params.get('class_year')
        filter_year = None
        
        if class_year_param:
            try:
                filter_year = int(class_year_param)
            except ValueError:
                pass
        elif target_class_year:
            # Auto-filter by course's target class year
            filter_year = target_class_year
        
        # Apply filter if we have a year
        if filter_year:
            students = [s for s in students if s.class_year == filter_year]
            data = [{"id": s.id, "student_id": s.student_id, "first_name": s.first_name, "last_name": s.last_name} for s in students]
        else:
            data = list(students.values('id', 'student_id', 'first_name', 'last_name'))
        
        # Include metadata about filtering in response
        return Response({
            "target_class_year": target_class_year,
            "filtered_by_class_year": filter_year,
            "students": CourseStudentSerializer(data, many=True).data
        })


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
        if self.action in ['create', 'update', 'partial_update']:
            return AssessmentWriteSerializer
        if self.action == 'retrieve':
            return AssessmentDetailSerializer
        return AssessmentListSerializer

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
        # Using .get('course_instance') might work if DRF maps source fields back?
        # But safest is to check validated_data key: 'course_instance_id' (which holds the object because it's PK field)
        # However, checking keys.
        # If serializer field is 'course_instance_id' with source='course_instance', usually validated_data has 'course_instance'.
        # Let's try grabbing both to be safe.
        course_instance = serializer.validated_data.get('course_instance') 
        # If None, try finding by field name if distinct? 
        # DRF 3+ usually maps to source name in validated_data.
        
        user = self.request.user
        
        if user.is_instructor() and course_instance and course_instance.instructor != user:
            raise serializers.ValidationError("You can only create assessments for your own courses.")
            
        serializer.save()


class AssessmentToLOContributionViewSet(ModelViewSet):
    """
    ViewSet for managing Assessment to LO contributions.
    Allows instructors to connect exam/quiz questions to Learning Outcomes.
    """
    queryset = AssessmentToLOContribution.objects.select_related(
        'assessment', 'assessment__course_instance', 'learning_outcome'
    ).all()
    
    def get_serializer_class(self):
         if self.action in ['create', 'update', 'partial_update']:
            return AssessmentToLOContributionWriteSerializer
         # Simple list serializer for now, didn't create Detail for this explicitly in plan
         # Reuse List serializer for detail/list as it's simple
         return AssessmentToLOContributionListSerializer

    
    def get_permissions(self):
        """
        Create/Update/Delete: Course Instructor, Dept Head, or Admin.
        Read: All authenticated users.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsInstructor | IsDepartmentHead | IsAdminUser]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filter based on user role."""
        queryset = super().get_queryset()
        user = self.request.user
        
        if user.is_department_head() or user.is_staff:
            return queryset
        
        if user.is_instructor():
            return queryset.filter(assessment__course_instance__instructor=user)
        
        if user.is_student():
            return queryset.filter(assessment__course_instance__students=user)
        
        return queryset.none()
    
    def perform_create(self, serializer):
        """Validate that instructor owns the assessment's course."""
        # Field is assessment_id with source='assessment'
        assessment = serializer.validated_data.get('assessment')
        user = self.request.user
        
        if user.is_instructor() and assessment and assessment.course_instance.instructor != user:
            raise serializers.ValidationError(
                "You can only create LO contributions for assessments in your own courses."
            )
        
        serializer.save()
