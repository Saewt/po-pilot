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
            "student_id", "first_name", "last_name", "active_courses"
        )
        depth = 1
    
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
            "student_id", "first_name", "last_name", "is_active", "date_joined"
        ]
        read_only_fields = ["id", "date_joined"]
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
            "department", "department_name", "is_active", "date_joined",
            "enrolled_courses_count", "po_scores"
        ]
        read_only_fields = ["id", "date_joined", "enrolled_courses_count", "po_scores"]
    
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