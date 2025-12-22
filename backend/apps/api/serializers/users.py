from rest_framework import serializers
from apps.users.models import User
from apps.core.models import Department

class UserMeSerializer(serializers.ModelSerializer):
    """Serializer for current authenticated user endpoint."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    active_courses = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            "id", "email", "role", "department", "department_name", 
            "student_id", "enrollment_year", "class_year", "must_change_password",
            "first_name", "last_name", "active_courses"
        )
        read_only_fields = ("id", "email", "role", "department", "department_name", "class_year", "active_courses")
    
    def get_active_courses(self, obj):
        """Get active enrolled courses for students."""
        if obj.is_student():
            return obj.get_active_enrolled_courses().count()
        elif obj.is_instructor():
            return obj.taught_courses.filter(is_active=True).count()
        return 0


class UserSerializer(serializers.ModelSerializer):
    """Standard user serializer for CRUD operations."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            "id", "email", "role", "department", "department_name", 
            "student_id", "enrollment_year", "class_year",
            "first_name", "last_name", "is_active", "date_joined"
        ]
        read_only_fields = ["id", "date_joined", "class_year"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
    
    def update(self, instance, validated_data):
        if "password" in validated_data:
            instance.set_password(validated_data.pop("password"))
        return super().update(instance, validated_data)


class StudentSerializer(serializers.ModelSerializer):
    """Detailed serializer for students with enrollment and achievement data."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    enrolled_courses_count = serializers.SerializerMethodField()
    po_scores = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "student_id",
            "enrollment_year", "class_year",
            "department", "department_name", "is_active", "date_joined",
            "enrolled_courses_count", "po_scores"
        ]
        read_only_fields = ["id", "date_joined", "class_year", "enrolled_courses_count", "po_scores"]
    
    def get_enrolled_courses_count(self, obj):
        """Get count of active enrolled courses."""
        return obj.get_active_enrolled_courses().count()
    
    def get_po_scores(self, obj):
        """Get overall PO achievement scores."""
        # This will be populated by the achievement calculator
        return obj.get_overall_po_scores()


class InstructorSerializer(serializers.ModelSerializer):
    """Detailed serializer for instructors with taught courses data."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    taught_courses_count = serializers.SerializerMethodField()
    active_courses = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name",
            "department", "department_name", "is_active", "date_joined",
            "taught_courses_count", "active_courses"
        ]
        read_only_fields = ["id", "date_joined"]
    
    def get_taught_courses_count(self, obj):
        """Get count of all taught courses."""
        return getattr(obj, "taught_courses_count", obj.taught_courses.count())
    
    def get_active_courses(self, obj):
        """Get count of active taught courses."""
        return getattr(obj, "active_courses_count", obj.taught_courses.filter(is_active=True).count())


class DepartmentHeadSerializer(serializers.ModelSerializer):
    """Detailed serializer for department heads with management data."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_details = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name",
            "department", "department_name", "is_active", "date_joined",
            "department_details"
        ]
        read_only_fields = ["id", "date_joined"]
    
    def get_department_details(self, obj):
        """Get department management statistics."""
        if not obj.department:
            return None
        
        return {
            "total_students": obj.department.members.filter(role="STUDENT").count(),
            "total_instructors": obj.department.members.filter(role="INSTRUCTOR").count(),
            "total_courses": obj.department.course_templates.count(),
            "active_program_outcomes": obj.department.program_outcomes.filter(is_active=True).count(),
        }


class DepartmentMemberCreateSerializer(serializers.ModelSerializer):
    """Serializer for Department Heads to create Instructors or Students."""
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ["id", "email", "password", "first_name", "last_name", "role", "student_id"]
        read_only_fields = ["id"]

    def validate_role(self, value):
        if value not in ["INSTRUCTOR", "STUDENT"]:
            raise serializers.ValidationError("You can only create Instructors or Students.")
        return value

    def validate(self, data):
        if data.get('role') == 'STUDENT' and not data.get('student_id'):
             raise serializers.ValidationError({"student_id": "Student ID is required for students."})
        return data

    def create(self, validated_data):
        # Auto-generate password if not provided: FirstName + LastName (no spaces)
        password = validated_data.pop('password', None)
        if not password:
            first_name = validated_data.get('first_name', '').strip().title()
            last_name = validated_data.get('last_name', '').strip().title()
            
            # Normalize names in validated_data as well
            validated_data['first_name'] = first_name
            validated_data['last_name'] = last_name

            raw_password = f"{first_name}{last_name}".replace(" ", "")
            
            # Helper for password normalization
            replacements = {
                'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G', 'ı': 'i', 'I': 'I', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
            }
            for tr, eng in replacements.items():
                raw_password = raw_password.replace(tr, eng)
            
            password = raw_password
        
        # Set must_change_password for auto-generated passwords
        validated_data['must_change_password'] = True
        
        user = User.objects.create_user(password=password, **validated_data)
        return user


# -----------------------------------------------------------------------------
# BULK STUDENT CREATION SERIALIZERS
# -----------------------------------------------------------------------------

class BulkStudentItemSerializer(serializers.Serializer):
    """Single student data for bulk creation."""
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    student_id = serializers.CharField(max_length=9)
    enrollment_year = serializers.IntegerField(required=False, allow_null=True)


class BulkStudentCreateSerializer(serializers.Serializer):
    """Bulk student creation request."""
    department = serializers.CharField(
        max_length=100,
        help_text="Department code or name (must match your department)"
    )
    students = serializers.ListField(
        child=BulkStudentItemSerializer(),
        help_text="List of students to create"
    )
    
    def validate_students(self, students):
        """Check for duplicate emails or student_ids."""
        emails = [s['email'] for s in students]
        student_ids = [s['student_id'] for s in students]
        
        # Check for duplicates within the request
        if len(emails) != len(set(emails)):
            raise serializers.ValidationError("Duplicate emails in request.")
        if len(student_ids) != len(set(student_ids)):
            raise serializers.ValidationError("Duplicate student IDs in request.")
        
        # Check for existing in database
        existing_emails = User.objects.filter(email__in=emails).values_list('email', flat=True)
        if existing_emails:
            raise serializers.ValidationError(f"Emails already exist: {list(existing_emails)}")
        
        existing_ids = User.objects.filter(student_id__in=student_ids).values_list('student_id', flat=True)
        if existing_ids:
            raise serializers.ValidationError(f"Student IDs already exist: {list(existing_ids)}")
        
        return students


class BulkStudentResultSerializer(serializers.Serializer):
    """Response for bulk student creation."""
    created_count = serializers.IntegerField()
    students = serializers.ListField(child=serializers.DictField())


class BulkStudentDeleteSerializer(serializers.Serializer):
    """Bulk student deletion request."""
    student_ids = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of Student IDs to delete"
    )
    
    def validate_student_ids(self, student_ids):
        """Check that all student IDs exist."""
        if not student_ids:
            raise serializers.ValidationError("At least one student ID is required.")
        
        existing = User.objects.filter(student_id__in=student_ids, role="STUDENT")
        existing_ids = set(existing.values_list('student_id', flat=True))
        missing = set(student_ids) - existing_ids
        
        if missing:
            raise serializers.ValidationError(f"Student IDs not found: {list(missing)}")
        
        return student_ids